import './App.css';
import { useState } from 'react';
const xrpl = require("xrpl");
const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
client.connect();

function App() {

  const [wallet, setWallet] = useState();
  const [accountInfo, setAccountInfo] = useState();
  const [txResult, setTxResult] = useState();
  const [balanceChanges, setBalanceChanges] = useState();
  const [loading, setLoading] = useState(false);
  
  const createWallet = async () => {
    setLoading(true);
    console.log("client is ", client);
    const fund_wallet = await client.fundWallet();
    const test_wallet = fund_wallet.wallet;
    sessionStorage.setItem("wallet", test_wallet);

    setWallet(test_wallet);
    console.log(test_wallet);
    setLoading(false);
  };

  const queryLedger = async () => {
    setLoading(true);
		// Get info from the ledger about the address we just funded
		const response = await client.request({
			command: "account_info",
			account: wallet.address,
			ledger_index: "validated",
		});
		console.log("response is: ",response);
    setAccountInfo(response.result.account_data);
    setLoading(false);
  }

  const sendXRP = async (e) => {
    e.preventDefault();
    setLoading(true);
    const {to, amount} = e.target;
    console.log("This is to: ", to.value);
    console.log("This is amount: ", amount.value);
    
		// Prepare transaction -------------------------------------------------------
		const prepared = await client.autofill({
			TransactionType: "Payment",
			Account: wallet.address,
			Amount: xrpl.xrpToDrops(amount.value),
			Destination: "rBYWifggi13qjBgGPNawXSycBA3xv9U9di",
		});
		const max_ledger = prepared.LastLedgerSequence;
		console.log("Prepared transaction instructions:", prepared);
		console.log("Transaction cost:", xrpl.dropsToXrp(prepared.Fee), "XRP");
		console.log("Transaction expires after ledger:", max_ledger);

		// Sign prepared instructions ------------------------------------------------
		const signed = wallet.sign(prepared);
		console.log("Identifying hash:", signed.hash);
		console.log("Signed blob:", signed.tx_blob);

		// Submit signed blob --------------------------------------------------------
		const tx = await client.submitAndWait(signed.tx_blob);

		// Wait for validation -------------------------------------------------------
		// submitAndWait() handles this automatically, but it can take 4-7s.
		// Check transaction results -------------------------------------------------
		console.log("Transaction result:", tx.result.meta.TransactionResult);
		console.log(
			"Balance changes:",
			JSON.stringify(xrpl.getBalanceChanges(tx.result.meta), null, 2)
		);
    const newBalances = xrpl.getBalanceChanges(tx.result.meta);
    console.log("new balances:", newBalances)
    setTxResult(tx.result);
    setBalanceChanges(newBalances);
    setLoading(false);
  }

  const clearSessionStorage = () => {
    sessionStorage.removeItem("wallet");
    setWallet();
    setAccountInfo();
    setTxResult();
    setBalanceChanges();
  }

  return (
		<div className="App">
			{wallet ? (
				<>
          <h1>All wallet information is stored in session storage and will be removed once you close this window or the browser!</h1>
					<p>Classic Address: {wallet.classicAddress}</p>
					<p>Private Key: {wallet.privateKey}</p>
					<p>Public Key: {wallet.publicKey}</p>
					<p>Seed: {wallet.seed}</p>
					{accountInfo ? (
						<div>
							<h1>Account Info: </h1>
							Account: {accountInfo.Account}
							<br />
							Balance: {accountInfo.Balance}
							<br />
							Flags: {accountInfo.Flags}
							<br />
							Ledger Entry Type: {accountInfo.LedgerEntryType}
							<br />
							Owner Count: {accountInfo.OwnerCount}
							<br />
							Previous Tx ID: {accountInfo.PreviousTxnID}
							<br />
							Previous TX Longer Sequence:{" "}
							{accountInfo.PreviousTxnLgrSeq}
							<br />
							Sequence: {accountInfo.Sequence}
						</div>
					) : (
						<button onClick={queryLedger}>Get Account Info</button>
					)}
				</>
			) : (
				<button onClick={createWallet}>Create Test Wallet</button>
			)}
			{wallet && 
      <>
        <form onSubmit={sendXRP}>
          To: <input type="string" name="to" placeholder='To' />
          <br />
          Amount: <input type="number" name="amount" placeholder='0' />
          <br />
          <button type="submit">Send XRP</button>
        </form>
        <button onClick={clearSessionStorage}>Remove Wallet and Create New One</button>

      </>
      }
			{txResult && (
				<div>
					<h3>
						Transaction Result: {txResult.meta.TransactionResult}
					</h3>
					<h3>Balance Changes:</h3>
					<p>To: {balanceChanges[0].account}</p>
					<p>
						Amount: {balanceChanges[0].balances[0].value}{" "}
						{balanceChanges[0].balances[0].currency}
					</p>
					<p>From: {balanceChanges[1].account}</p>
					<p>
						Amount: {balanceChanges[1].balances[0].value}{" "}
						{balanceChanges[1].balances[0].currency}
					</p>
				</div>
			)}
			{loading && <h1>Loading...</h1>}
		</div>
  );
}

export default App;


// //test wallet
// Classic Address: rBYWifggi13qjBgGPNawXSycBA3xv9U9di

// Private Key: ED21A20E89B3E0C43B18CDFECD08EDFCFCA028CCE6E68A17EF695A0450E1D2A839

// Public Key: ED4B53F6B3994C8FCAC6EB4D36E54D78941941CB1F4105311DAE922C4127FC07B8

// Seed: sEdTYFyQbFYFobSiCtZ6u1kRChwT8Re

// Balance: 1000000000