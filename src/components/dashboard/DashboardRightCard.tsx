export default function DashboardRightCard() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-gray-900">Quick Actions</h2>
      <ul className="space-y-3">
        <li className="p-3 rounded-md bg-green-50 hover:bg-green-100 cursor-pointer font-medium text-green-800">
          📍 Use My Current Location
        </li>
        <li className="p-3 rounded-md bg-blue-50 hover:bg-blue-100 cursor-pointer font-medium text-blue-800">
          ➤ Start a New Route
        </li>
        <li className="p-3 rounded-md bg-yellow-50 hover:bg-yellow-100 cursor-pointer font-medium text-yellow-800">
          ⭐ View Saved Spots
        </li>
      </ul>
    </div>
  );
}
