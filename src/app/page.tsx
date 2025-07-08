import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";

const Page = async () => {
  const users = await prisma.user.findMany({
    include: {
      posts: true,
    },
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <ul className="space-y-4">
        {users.map((user) => (
          <li key={user.id} className="border p-4 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold">{user.name}</h2>
            <p>{user.email}</p>
            <div className="mt-2">
              {user.posts.map((post) => (
                <div key={post.id} className="mt-2">
                  <h3 className="font-medium">{post.title}</h3>
                  <p>{post.content}</p>
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <Button className="mt-6">Add User</Button>
    </div>
  );
}
export default Page;