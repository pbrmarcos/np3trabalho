import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionState {
  isSubscribed: boolean;
  planName: string | null;
  subscriptionEnd: string | null;
  paymentType: "recurring" | "one_time" | null;
  daysUntilExpiration: number | null;
  isLoading: boolean;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    planName: null,
    subscriptionEnd: null,
    paymentType: null,
    daysUntilExpiration: null,
    isLoading: true,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setState({ isSubscribed: false, planName: null, subscriptionEnd: null, paymentType: null, daysUntilExpiration: null, isLoading: false });
        return;
      }

      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        console.error("Error checking subscription:", error);
        setState({ isSubscribed: false, planName: null, subscriptionEnd: null, paymentType: null, daysUntilExpiration: null, isLoading: false });
        return;
      }

      setState({
        isSubscribed: data?.subscribed ?? false,
        planName: data?.plan_name ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        paymentType: data?.payment_type ?? null,
        daysUntilExpiration: data?.days_until_expiration ?? null,
        isLoading: false,
      });
    } catch (err) {
      console.error("Error:", err);
      setState({ isSubscribed: false, planName: null, subscriptionEnd: null, paymentType: null, daysUntilExpiration: null, isLoading: false });
    }
  }, []);

  useEffect(() => {
    checkSubscription();

    // Polling every 60 seconds
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return {
    isSubscribed: state.isSubscribed,
    planName: state.planName,
    subscriptionEnd: state.subscriptionEnd,
    paymentType: state.paymentType,
    daysUntilExpiration: state.daysUntilExpiration,
    isLoading: state.isLoading,
    refresh: checkSubscription,
  };
}
