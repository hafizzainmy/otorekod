import { redirect } from "next/navigation";
import { Car } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard-header";
import { AddVehicleForm } from "@/components/add-vehicle-form";
import { VehicleCard } from "@/components/vehicle-card";
import type { VehicleWithReceipts } from "@/lib/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("*, receipts(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load vehicles:", error.message);
  }

  const vehicleList = (vehicles ?? []) as VehicleWithReceipts[];

  return (
    <div className="min-h-full bg-slate-50">
      <DashboardHeader email={user.email ?? ""} />

      <main className="mx-auto max-w-lg space-y-5 px-4 py-5 pb-10">
        <AddVehicleForm userId={user.id} />

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">My Vehicles</h2>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
              {vehicleList.length}
            </span>
          </div>

          {vehicleList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <Car className="h-6 w-6" />
              </div>
              <p className="font-medium text-slate-800">No vehicles yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Tap &quot;Add Vehicle&quot; above to register your first car.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {vehicleList.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  userId={user.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
