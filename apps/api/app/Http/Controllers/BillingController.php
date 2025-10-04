<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\StripeClient;

/**
 * @tags Billing
 */
class BillingController extends Controller
{
    public function checkoutSession(Request $request): JsonResponse
    {
        $user = $request->user();
        $price = env('STRIPE_PRICE_ID');
        $success = env('STRIPE_SUCCESS_URL');
        $cancel = env('STRIPE_CANCEL_URL');
        if (!$price || !$success || !$cancel) return response()->json(['error'=>'Stripe billing is not fully configured'],503);
        // Ensure Stripe customer via Cashier
        $user->createOrGetStripeCustomer();
        if (!$user->stripe_customer_id && $user->stripe_id) { $user->stripe_customer_id = $user->stripe_id; $user->save(); }
        // Build Checkout via Cashier and return URL for SPA redirect
        $checkout = $user->newSubscription('default', $price)->checkout([
            'success_url' => $success,
            'cancel_url' => $cancel,
            'subscription_data' => ['metadata' => ['userId' => (string)$user->id]],
        ])->asStripeCheckoutSession();
        return response()->json(['url' => $checkout->url]);
    }

    public function portalSession(Request $request): JsonResponse
    {
        $user = $request->user();
        $returnUrl = env('STRIPE_BILLING_PORTAL_RETURN_URL') ?: env('STRIPE_SUCCESS_URL');
        if (!$returnUrl) return response()->json(['error'=>'Billing portal return URL is not configured'],503);
        $user->createOrGetStripeCustomer();
        if (!$user->stripe_customer_id && $user->stripe_id) { $user->stripe_customer_id = $user->stripe_id; $user->save(); }
        $url = $user->billingPortalUrl($returnUrl);
        return response()->json(['url' => $url]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $sub = $user->subscription('default');
        // Prefer Cashier data; fall back to user columns for unchanged fields
        $stripeCustomerId = $user->stripe_id ?: $user->stripe_customer_id;
        $stripeSubscriptionId = $sub?->stripe_id ?: $user->stripe_subscription_id;
        $subscriptionStatus = $sub?->stripe_status ?: ($user->subscription_status ?: 'inactive');
        $cancelAtPeriodEnd = $sub ? (bool) ($sub->cancel_at !== null) : (bool) $user->cancel_at_period_end;
        $trialEndsAt = $sub?->trial_ends_at ?: $user->trial_ends_at;
        $subscriptionPlan = $user->subscription_plan ?: 'pro';
        $subscriptionCurrentPeriodEnd = $user->subscription_current_period_end; // keep from webhook/user sync

        return response()->json(['user' => [
            'id' => (string) $user->id,
            'email' => $user->email,
            'name' => $user->name,
            'createdAt' => $user->created_at,
            'isAdmin' => (bool)$user->is_admin,
            'stripeCustomerId' => $stripeCustomerId,
            'stripeSubscriptionId' => $stripeSubscriptionId,
            'subscriptionStatus' => $subscriptionStatus,
            'subscriptionPlan' => $subscriptionPlan,
            'subscriptionCurrentPeriodEnd' => $subscriptionCurrentPeriodEnd,
            'cancelAtPeriodEnd' => $cancelAtPeriodEnd,
            'trialEndsAt' => $trialEndsAt,
            'trialNotes' => $user->trial_notes,
        ]]);
    }
}
