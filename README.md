socket.io0.9.x-memleak
======================


Memory leak test for socket.io 0.9.x + RedisStore + node-cluster.

Based on http://runnable.com/UtYiumRuJT8sAABz/socket-io-memory-leak-for-express-node-js-and-cluster


start with `node index.js`

browse to `http://localhost:4568`

watch memory usage on console or top

a heapdump will be saved at app start and every 30 seconds 
