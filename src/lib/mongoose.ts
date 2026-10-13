// Kept for existing imports; both helpers share one connection and the same database
// resolution so they can't point at different databases.
export { connectToDB as connectToDatabase } from "@/lib/mongodb";
