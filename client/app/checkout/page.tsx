import { Suspense } from "react";
import { CheckoutForm } from "./checkout-form";

export const metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-8">
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-muted-foreground">Memuat...</p>
          </div>
        </div>
      }
    >
      <CheckoutForm />
    </Suspense>
  );
}
