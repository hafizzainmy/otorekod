import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-10">
      <AuthForm />
    </div>
  );
}
