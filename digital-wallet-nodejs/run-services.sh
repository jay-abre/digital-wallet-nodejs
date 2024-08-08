#!/bin/bash
# run the ts-node server
ts-node server.ts
# Start the Docker Compose services
docker-compose up -d --build

# Wait for a few seconds to ensure MongoDB is up and running
sleep 10

# Execute MongoDB commands inside the MongoDB container
docker exec -it digital-wallet-nodejs-mongodb-1 bash -c "
  mongosh -u root -p example <<EOF
  use test
  show collections
  db.users.find().pretty()
  EOF
"