import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-white">
      <h1 className="text-4xl font-bold mb-8 text-gray-900">Liability Release App</h1>
      <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-lg font-medium">
        Go to Admin Dashboard
      </Link>
    </main>
  );
}
