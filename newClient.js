// // In browsers, use a <script> tag. In Node.js, uncomment the following line:
// const xrpl = require("xrpl");

// // Wrap code in an async function so we can use await
// module.exports = async function main() {
// 	// Define the network client
// 	const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
// 	await client.connect();

// 	// ... custom code goes here


// 	// Disconnect when done (If you omit this, Node.js won't end the process)
// 	//client.disconnect()
// }

// // when i want to connect mainnet or testnet my own server

// const MY_SERVER = "ws://localhost:6006/";
// const client = new xrpl.Client(MY_SERVER);
// await client.connect();

// // when i want to connect mainnet public server

// const PUBLIC_SERVER = "wss://xrplcluster.com/";
// const client = new xrpl.Client(PUBLIC_SERVER);
// await client.connect();
