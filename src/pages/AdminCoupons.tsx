import AdminLayoutWithSidebar from "@/components/AdminLayoutWithSidebar";
import CouponsConfigForm from "@/components/admin/CouponsConfigForm";

export default function AdminCoupons() {
  const breadcrumbs = [
    { label: "Dashboard", href: "/admin" },
    { label: "Cupons" },
  ];

  return (
    <AdminLayoutWithSidebar breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cupons e Promoções</h1>
          <p className="text-muted-foreground">
            Gerencie cupons de desconto e códigos promocionais para usar no checkout.
          </p>
        </div>

        <CouponsConfigForm />
      </div>
    </AdminLayoutWithSidebar>
  );
}
