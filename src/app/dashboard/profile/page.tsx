import { requireUser } from "@/lib/auth/requireUser";

export default async function ProfilePage() {
  const user = await requireUser(); // 🔒 Server-side auth gate

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Your Profile</h1>

      <div className="flex items-center gap-6">
        <img
          src={user.image ?? "/default-avatar.png"}
          alt="Avatar"
          className="w-20 h-20 rounded-full border border-gray-300 object-cover"
        />

        <div className="space-y-1">
          <p className="text-lg font-medium text-gray-900">{user.name}</p>
          <p className="text-gray-600">{user.email}</p>
        </div>
      </div>

      <div className="mt-8 text-gray-700">
        <p>This is your account area. More settings coming soon.</p>
      </div>
    </div>
  );
}
