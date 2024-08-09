import { MongoClient } from 'mongodb';

async function createAdminUser() {
  const uri = 'mongodb://localhost:27017'; 
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const adminDb = client.db('admin');

    await adminDb.command({
      createUser: "root",
      pwd: "example",
      roles: [{ role: "root", db: "admin" }]
    });

    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await client.close();
  }
}

createAdminUser().catch(console.error);