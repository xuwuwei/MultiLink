package com.keyboardn.app.plugins

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.Offering
import com.revenuecat.purchases.Offerings
import com.revenuecat.purchases.Package
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.interfaces.GetOfferingsCallback
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback
import com.revenuecat.purchases.interfaces.PurchaseCallback
import com.revenuecat.purchases.interfaces.ReceiveOfferingsCallback
import com.revenuecat.purchases.interfaces.SyncPurchasesCallback
import com.revenuecat.purchases.models.StoreTransaction
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

@CapacitorPlugin(name = "Purchases")
class PurchasesPlugin : Plugin() {

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    @PluginMethod
    fun configure(call: PluginCall) {
        val apiKey = call.getString("apiKey") ?: run {
            call.reject("Missing apiKey")
            return
        }
        val appUserId = call.getString("appUserId")

        val config = PurchasesConfiguration.Builder(context, apiKey)
            .apply { if (appUserId != null) appUserID(appUserId) }
            .build()

        Purchases.configure(config)

        Purchases.sharedInstance.updatedCustomerInfoListener = { customerInfo ->
            val data = JSObject()
            data.put("customerInfo", convertCustomerInfo(customerInfo))
            notifyListeners("purchaserInfoUpdate", data)
        }

        call.resolve()
    }

    @PluginMethod
    fun getCustomerInfo(call: PluginCall) {
        Purchases.sharedInstance.getCustomerInfo(object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) {
                val result = JSObject()
                result.put("customerInfo", convertCustomerInfo(customerInfo))
                call.resolve(result)
            }
            override fun onError(error: PurchasesError) {
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun getOfferings(call: PluginCall) {
        Purchases.sharedInstance.getOfferings(object : ReceiveOfferingsCallback {
            override fun onReceived(offerings: Offerings) {
                val result = JSObject()
                result.put("offerings", convertOfferings(offerings))
                call.resolve(result)
            }
            override fun onError(error: PurchasesError) {
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun purchasePackage(call: PluginCall) {
        val identifier = call.getString("identifier") ?: run {
            call.reject("Missing package identifier")
            return
        }
        val offeringIdentifier = call.getString("offeringIdentifier") ?: run {
            call.reject("Missing offering identifier")
            return
        }

        Purchases.sharedInstance.getOfferings(object : ReceiveOfferingsCallback {
            override fun onReceived(offerings: Offerings) {
                val pkg = offerings[offeringIdentifier]?.getPackage(identifier)
                if (pkg == null) {
                    call.reject("Package not found")
                    return
                }

                activity?.let { act ->
                    Purchases.sharedInstance.purchase(act, pkg, object : PurchaseCallback {
                        override fun onCompleted(storeTransaction: StoreTransaction, customerInfo: CustomerInfo) {
                            val result = JSObject()
                            result.put("customerInfo", convertCustomerInfo(customerInfo))
                            result.put("productIdentifier", storeTransaction.productIds.firstOrNull() ?: "")
                            call.resolve(result)
                        }
                        override fun onError(error: PurchasesError, userCancelled: Boolean) {
                            if (userCancelled) {
                                call.reject("User cancelled", "PURCHASE_CANCELLED")
                            } else {
                                call.reject(error.message)
                            }
                        }
                    })
                } ?: call.reject("Activity not available")
            }
            override fun onError(error: PurchasesError) {
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun restorePurchases(call: PluginCall) {
        Purchases.sharedInstance.restorePurchases(object : ReceiveCustomerInfoCallback {
            override fun onReceived(customerInfo: CustomerInfo) {
                val result = JSObject()
                result.put("customerInfo", convertCustomerInfo(customerInfo))
                call.resolve(result)
            }
            override fun onError(error: PurchasesError) {
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun syncPurchases(call: PluginCall) {
        Purchases.sharedInstance.syncPurchases(object : SyncPurchasesCallback {
            override fun onSuccess(customerInfo: CustomerInfo) {
                call.resolve()
            }
            override fun onError(error: PurchasesError) {
                call.reject(error.message)
            }
        })
    }

    @PluginMethod
    fun setDebugLogsEnabled(call: PluginCall) {
        val enabled = call.getBoolean("enabled", false) ?: false
        Purchases.debugLogsEnabled = enabled
        call.resolve()
    }

    // MARK: - Helpers

    private fun convertCustomerInfo(info: CustomerInfo): JSObject {
        val entitlements = JSObject()
        val active = JSObject()
        info.entitlements.active.forEach { (k, v) -> active.put(k, convertEntitlement(v)) }
        val all = JSObject()
        info.entitlements.all.forEach { (k, v) -> all.put(k, convertEntitlement(v)) }
        entitlements.put("active", active)
        entitlements.put("all", all)

        val nonSubs = JSONArray()
        info.nonSubscriptionTransactions.forEach { nonSubs.put(convertNonSubscriptionTransaction(it)) }

        val result = JSObject()
        result.put("entitlements", entitlements)
        result.put("firstSeen", isoFormat.format(info.firstSeen))
        result.put("originalAppUserId", info.originalAppUserId)
        result.put("originalPurchaseDate", info.originalPurchaseDate?.let { isoFormat.format(it) })
        result.put("nonSubscriptionTransactions", nonSubs)
        return result
    }

    private fun convertEntitlement(e: com.revenuecat.purchases.EntitlementInfo): JSObject {
        val result = JSObject()
        result.put("identifier", e.identifier)
        result.put("isActive", e.isActive)
        result.put("willRenew", e.willRenew)
        result.put("latestPurchaseDate", isoFormat.format(e.latestPurchaseDate))
        result.put("originalPurchaseDate", isoFormat.format(e.originalPurchaseDate))
        result.put("expirationDate", e.expirationDate?.let { isoFormat.format(it) })
        result.put("productIdentifier", e.productIdentifier)
        return result
    }

    private fun convertNonSubscriptionTransaction(t: com.revenuecat.purchases.models.Transaction): JSObject {
        val result = JSObject()
        result.put("productIdentifier", t.productIdentifier)
        result.put("purchaseDate", isoFormat.format(t.purchaseDate))
        result.put("transactionIdentifier", t.transactionIdentifier)
        return result
    }

    private fun convertOfferings(offerings: Offerings): JSObject {
        val result = JSObject()
        result.put("current", offerings.current?.let { convertOffering(it) })
        val all = JSObject()
        offerings.all.forEach { (k, v) -> all.put(k, convertOffering(v)) }
        result.put("all", all)
        return result
    }

    private fun convertOffering(offering: Offering): JSObject {
        val pkgs = JSONArray()
        offering.availablePackages.forEach { pkgs.put(convertPackage(it)) }
        val result = JSObject()
        result.put("identifier", offering.identifier)
        result.put("availablePackages", pkgs)
        return result
    }

    private fun convertPackage(pkg: Package): JSObject {
        val result = JSObject()
        result.put("identifier", pkg.identifier)
        result.put("packageType", pkg.packageType.name)
        result.put("offeringIdentifier", pkg.offering)
        result.put("product", convertProduct(pkg.product))
        return result
    }

    private fun convertProduct(product: com.revenuecat.purchases.models.StoreProduct): JSObject {
        val result = JSObject()
        result.put("identifier", product.purchasingData.productIdentifier)
        result.put("description", product.description)
        result.put("title", product.title)
        result.put("price", product.price.amountMicros / 1_000_000.0)
        result.put("priceString", product.price.formatted)
        result.put("currencyCode", product.price.currencyCode)
        return result
    }
}
