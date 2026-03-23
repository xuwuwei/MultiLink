import Capacitor
import RevenueCat

@objc(PurchasesPlugin)
public class PurchasesPlugin: CAPPlugin, CAPBridgedPlugin, PurchasesDelegate {
    public let identifier = "PurchasesPlugin"
    public let jsName = "Purchases"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure",           returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCustomerInfo",     returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getOfferings",        returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchasePackage",     returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restorePurchases",    returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncPurchases",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setDebugLogsEnabled", returnType: CAPPluginReturnPromise),
    ]

    // PurchasesDelegate - called when customer info updates
    public func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        notifyListeners("purchaserInfoUpdate", data: ["customerInfo": convertCustomerInfo(customerInfo)])
    }

    @objc func configure(_ call: CAPPluginCall) {
        guard let apiKey = call.getString("apiKey") else {
            call.reject("Missing apiKey"); return
        }
        let appUserId = call.getString("appUserId")
        Purchases.configure(withAPIKey: apiKey, appUserID: appUserId)
        Purchases.shared.delegate = self
        call.resolve()
    }

    @objc func getCustomerInfo(_ call: CAPPluginCall) {
        Purchases.shared.getCustomerInfo { [weak self] customerInfo, error in
            if let error = error { call.reject(error.localizedDescription); return }
            call.resolve(["customerInfo": self?.convertCustomerInfo(customerInfo) ?? [:]])
        }
    }

    @objc func getOfferings(_ call: CAPPluginCall) {
        Purchases.shared.getOfferings { [weak self] offerings, error in
            if let error = error { call.reject(error.localizedDescription); return }
            call.resolve(["offerings": self?.convertOfferings(offerings) ?? [:]])
        }
    }

    @objc func purchasePackage(_ call: CAPPluginCall) {
        guard let identifier = call.getString("identifier"),
              let offeringIdentifier = call.getString("offeringIdentifier") else {
            call.reject("Missing package identifier or offering identifier"); return
        }
        Purchases.shared.getOfferings { [weak self] offerings, error in
            if let error = error { call.reject(error.localizedDescription); return }
            guard let package = offerings?.offering(identifier: offeringIdentifier)?.package(identifier: identifier) else {
                call.reject("Package not found"); return
            }
            Purchases.shared.purchase(package: package) { [weak self] transaction, customerInfo, error, userCancelled in
                if userCancelled { call.reject("User cancelled", "PURCHASE_CANCELLED"); return }
                if let error = error { call.reject(error.localizedDescription); return }
                call.resolve([
                    "customerInfo": self?.convertCustomerInfo(customerInfo) ?? [:],
                    "productIdentifier": package.storeProduct.productIdentifier
                ])
            }
        }
    }

    @objc func restorePurchases(_ call: CAPPluginCall) {
        Purchases.shared.restorePurchases { [weak self] customerInfo, error in
            if let error = error { call.reject(error.localizedDescription); return }
            call.resolve(["customerInfo": self?.convertCustomerInfo(customerInfo) ?? [:]])
        }
    }

    @objc func syncPurchases(_ call: CAPPluginCall) {
        Purchases.shared.syncPurchases { _, error in
            if let error = error { call.reject(error.localizedDescription); return }
            call.resolve()
        }
    }

    @objc func setDebugLogsEnabled(_ call: CAPPluginCall) {
        Purchases.logLevel = call.getBool("enabled", false) ? .debug : .warn
        call.resolve()
    }

    // MARK: - Helpers

    private func convertCustomerInfo(_ customerInfo: CustomerInfo?) -> [String: Any] {
        guard let customerInfo = customerInfo else { return [:] }
        return [
            "entitlements": [
                "active": customerInfo.entitlements.active.mapValues { convertEntitlement($0) },
                "all": customerInfo.entitlements.all.mapValues { convertEntitlement($0) }
            ],
            "firstSeen": customerInfo.firstSeen.ISO8601Format(),
            "originalAppUserId": customerInfo.originalAppUserId,
            "originalPurchaseDate": customerInfo.originalPurchaseDate?.ISO8601Format() as Any,
            "nonSubscriptionTransactions": customerInfo.nonSubscriptionTransactions.map { convertNonSubscriptionTransaction($0) }
        ]
    }

    private func convertEntitlement(_ e: EntitlementInfo) -> [String: Any] {
        return [
            "identifier": e.identifier,
            "isActive": e.isActive,
            "willRenew": e.willRenew,
            "latestPurchaseDate": e.latestPurchaseDate?.ISO8601Format() as Any,
            "originalPurchaseDate": e.originalPurchaseDate?.ISO8601Format() as Any,
            "expirationDate": e.expirationDate?.ISO8601Format() as Any,
            "productIdentifier": e.productIdentifier
        ]
    }

    private func convertNonSubscriptionTransaction(_ t: StoreTransaction) -> [String: Any] {
        return [
            "productIdentifier": t.productIdentifier,
            "purchaseDate": t.purchaseDate.ISO8601Format(),
            "transactionIdentifier": t.transactionIdentifier
        ]
    }

    private func convertOfferings(_ offerings: Offerings?) -> [String: Any] {
        guard let offerings = offerings else { return [:] }
        return [
            "current": offerings.current.map { convertOffering($0) } as Any,
            "all": offerings.all.mapValues { convertOffering($0) }
        ]
    }

    private func convertOffering(_ offering: Offering) -> [String: Any] {
        return [
            "identifier": offering.identifier,
            "availablePackages": offering.availablePackages.map { convertPackage($0) },
            "metadata": offering.metadata
        ]
    }

    private func convertPackage(_ package: Package) -> [String: Any] {
        return [
            "identifier": package.identifier,
            "packageType": package.packageType.rawValue,
            "offeringIdentifier": package.offeringIdentifier,
            "product": convertProduct(package.storeProduct)
        ]
    }

    private func convertProduct(_ product: StoreProduct) -> [String: Any] {
        return [
            "identifier": product.productIdentifier,
            "description": product.localizedDescription,
            "title": product.localizedTitle,
            "price": product.price,
            "priceString": product.localizedPriceString,
            "currencyCode": product.currencyCode ?? ""
        ]
    }
}
