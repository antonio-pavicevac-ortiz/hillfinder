import SignupForm from "@/components/signup/SignupForm";

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-bold mb-4">Create your account</h1>
      <SignupForm />
    </main>
  );
}
