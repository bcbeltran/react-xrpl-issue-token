import "./App.css";
import { useState } from "react";
const xrpl = require("xrpl");
const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
client.connect();

function App() {
	const [coldWallet, setColdWallet] = useState();
	const [hotWallet, setHotWallet] = useState();
	const [coldAccountInfo, setColdAccountInfo] = useState();
	const [hotAccountInfo, setHotAccountInfo] = useState();
	const [sendTokenTxResult, setSendTokenTxResult] = useState();
	const [createTrustLineTxResult, setCreateTrustLineTxResult] = useState();
	const [trustLineCreated, setTrustLineCreated] = useState(false);
	const [loading, setLoading] = useState(false);
	const [hotTokenBalances, setHotTokenBalances] = useState();
	const [coldTokenBalances, setColdTokenBalances] = useState();
	let keys;
	let values;
	
	if(coldTokenBalances) {
		keys = Object.keys(coldTokenBalances.balances);
		values = Object.values(coldTokenBalances.balances);
		// console.log("keys: ", keys);
		// console.log("values: ", values);
	}

	const clearSessionStorage = () => {
		window.sessionStorage.removeItem("coldWallet");
		window.sessionStorage.removeItem("hotWallet");
		setColdWallet();
		setHotWallet();
		setColdAccountInfo();
		setHotAccountInfo();
		setCreateTrustLineTxResult();
		setSendTokenTxResult();
		setTrustLineCreated(false);
		setHotTokenBalances();
		setColdTokenBalances();
	};

	const getColdAccountInfo = async () => {
		setLoading(true);
		// Get info from the ledger about the address we just funded
		const response = await client.request({
			command: "account_info",
			account: coldWallet.address,
			ledger_index: "validated",
		});
		//console.log("response is: ",response);
		setColdAccountInfo(response.result.account_data);
		setLoading(false);
	};

	const getHotAccountInfo = async () => {
		setLoading(true);
		// Get info from the ledger about the address we just funded
		const response = await client.request({
			command: "account_info",
			account: hotWallet.address,
			ledger_index: "validated",
		});
		//console.log("response is: ",response);
		setHotAccountInfo(response.result.account_data);
		setLoading(false);
	};

	const createColdWalletAddress = async () => {
		setLoading(true);
		//console.log("client is ", client);
		const fund_wallet = await client.fundWallet();
		const test_wallet = fund_wallet.wallet;
		window.sessionStorage.setItem("coldWallet", test_wallet);

		setColdWallet(test_wallet);
		//console.log(test_wallet);
		// Configure issuer (cold address) settings ----------------------------------
		const cold_settings_tx = {
			TransactionType: "AccountSet",
			Account: test_wallet.address,
			TransferRate: 0,
			TickSize: 5,
			Domain: "6578616D706C652E636F6D", // "example.com"
			SetFlag: xrpl.AccountSetAsfFlags.asfDefaultRipple,
			// Using tf flags, we can enable more flags in one transaction
			Flags:
				xrpl.AccountSetTfFlags.tfDisallowXRP |
				xrpl.AccountSetTfFlags.tfRequireDestTag,
		};

		const cst_prepared = await client.autofill(cold_settings_tx);
		const cst_signed = test_wallet.sign(cst_prepared);
		console.log("Sending cold address AccountSet transaction...");
		const cst_result = await client.submitAndWait(cst_signed.tx_blob);
		setLoading(false);
		if (cst_result.result.meta.TransactionResult === "tesSUCCESS") {
			console.log(
				`Transaction succeeded: https://testnet.xrpl.org/transactions/${cst_signed.hash}`
			);
		} else {
			throw Error(`Error sending transaction: ${cst_result}`);
		}
	};

	const createHotWalletAddress = async () => {
		setLoading(true);
		//console.log("client is ", client);
		const fund_wallet = await client.fundWallet();
		const test_wallet = fund_wallet.wallet;
		window.sessionStorage.setItem("hotWallet", test_wallet);

		setHotWallet(test_wallet);
		//console.log(test_wallet);
		// Configure hot address settings --------------------------------------------

		const hot_settings_tx = {
			TransactionType: "AccountSet",
			Account: test_wallet.address,
			Domain: "6578616D706C652E636F6D", // "example.com"
			// enable Require Auth so we can't use trust lines that users
			// make to the hot address, even by accident:
			SetFlag: xrpl.AccountSetAsfFlags.asfRequireAuth,
			Flags:
				xrpl.AccountSetTfFlags.tfDisallowXRP |
				xrpl.AccountSetTfFlags.tfRequireDestTag,
		};

		const hst_prepared = await client.autofill(hot_settings_tx);
		const hst_signed = test_wallet.sign(hst_prepared);
		console.log("Sending hot address AccountSet transaction...");
		const hst_result = await client.submitAndWait(hst_signed.tx_blob);
		setLoading(false);
		if (hst_result.result.meta.TransactionResult === "tesSUCCESS") {
			console.log(
				`Transaction succeeded: https://testnet.xrpl.org/transactions/${hst_signed.hash}`
			);
		} else {
			throw Error(
				`Error sending transaction: ${hst_result.result.meta.TransactionResult}`
			);
		}
	};

	const createTrustLine = async () => {
		setLoading(true);
		// Create trust line from hot to cold address --------------------------------
		const currency_code = "FOO";
		const trust_set_tx = {
			TransactionType: "TrustSet",
			Account: hotWallet.address,
			LimitAmount: {
				currency: currency_code,
				issuer: coldWallet.address,
				value: "10000000000", // Large limit, arbitrarily chosen
			},
		};

		const ts_prepared = await client.autofill(trust_set_tx);
		const ts_signed = hotWallet.sign(ts_prepared);
		console.log("Creating trust line from hot address to issuer...");
		const ts_result = await client.submitAndWait(ts_signed.tx_blob);
		setCreateTrustLineTxResult(ts_result.result);
		console.log("ts_result: ", ts_result.result);
		setLoading(false);
		if (ts_result.result.meta.TransactionResult === "tesSUCCESS") {
			setTrustLineCreated(true);
			console.log(
				`Transaction succeeded: https://testnet.xrpl.org/transactions/${ts_signed.hash}`
			);
		} else {
			throw Error(
				`Error sending transaction: ${ts_result.result.meta.TransactionResult}`
			);
		}
	};

	const sendToken = async () => {
		setLoading(true);
		// Send token ----------------------------------------------------------------
		const issue_quantity = "3840";
		const send_token_tx = {
			TransactionType: "Payment",
			Account: coldWallet.address,
			Amount: {
				currency: "FOO",
				value: issue_quantity,
				issuer: coldWallet.address,
			},
			Destination: hotWallet.address,
			DestinationTag: 1, // Needed since we enabled Require Destination Tags
			// on the hot account earlier.
		};

		const pay_prepared = await client.autofill(send_token_tx);
		const pay_signed = coldWallet.sign(pay_prepared);
		console.log(`Sending ${issue_quantity} FOO to ${hotWallet.address}...`);
		const pay_result = await client.submitAndWait(pay_signed.tx_blob);
		setSendTokenTxResult(pay_result.result);
		console.log("Send token tx result: ", pay_result.result);
		setLoading(false);
		if (pay_result.result.meta.TransactionResult === "tesSUCCESS") {
			console.log(
				`Transaction succeeded: https://testnet.xrpl.org/transactions/${pay_signed.hash}`
			);
		} else {
			throw Error(
				`Error sending transaction: ${pay_result.result.meta.TransactionResult}`
			);
		}
	};

	const getIssuerTokenBalance = async () => {
		// Check balances ------------------------------------------------------------

		console.log("Getting cold address balances...");
		const cold_balances = await client.request({
			command: "gateway_balances",
			account: coldWallet.address,
			ledger_index: "validated",
			hotwallet: [hotWallet.address],
		});
		setColdTokenBalances(cold_balances.result);
	};

	const getHolderTokenBalance = async () => {
		console.log("Getting hot address balances...");
		const hot_balances = await client.request({
			command: "account_lines",
			account: hotWallet.address,
			ledger_index: "validated",
		});
		setHotTokenBalances(hot_balances.result);
		console.log(hot_balances.result);
	};

	return (
		<div className="App">
			{coldWallet ? (
				<>
					<h3>
						All wallet information is stored in session storage and
						will be removed once you close this window or the
						browser!
					</h3>
					<h1>Cold Wallet</h1>
					<p>Classic Address: {coldWallet.classicAddress}</p>
					<p>Private Key: {coldWallet.privateKey}</p>
					<p>Public Key: {coldWallet.publicKey}</p>
					<p>Seed: {coldWallet.seed}</p>
					{coldAccountInfo ? (
						<div>
							<h1>Cold Account Info: </h1>
							Account: {coldAccountInfo.Account}
							<br />
							Balance: {coldAccountInfo.Balance}
							<br />
							Flags: {coldAccountInfo.Flags}
							<br />
							Ledger Entry Type: {coldAccountInfo.LedgerEntryType}
							<br />
							Owner Count: {coldAccountInfo.OwnerCount}
							<br />
							Previous Tx ID: {coldAccountInfo.PreviousTxnID}
							<br />
							Previous TX Longer Sequence:{" "}
							{coldAccountInfo.PreviousTxnLgrSeq}
							<br />
							Sequence: {coldAccountInfo.Sequence}
						</div>
					) : (
						<>
							<button onClick={getColdAccountInfo}>
								Get Cold Account Info
							</button>
						</>
					)}
				</>
			) : (
				<button onClick={createColdWalletAddress}>
					Create Cold Wallet
				</button>
			)}
			{hotWallet ? (
				<>
					<h1>Hot Wallet</h1>
					<p>Classic Address: {hotWallet.classicAddress}</p>
					<p>Private Key: {hotWallet.privateKey}</p>
					<p>Public Key: {hotWallet.publicKey}</p>
					<p>Seed: {hotWallet.seed}</p>
					{hotAccountInfo ? (
						<div>
							<h1>Hot Account Info: </h1>
							Account: {hotAccountInfo.Account}
							<br />
							Balance: {hotAccountInfo.Balance}
							<br />
							Flags: {hotAccountInfo.Flags}
							<br />
							Ledger Entry Type: {hotAccountInfo.LedgerEntryType}
							<br />
							Owner Count: {hotAccountInfo.OwnerCount}
							<br />
							Previous Tx ID: {hotAccountInfo.PreviousTxnID}
							<br />
							Previous TX Longer Sequence:{" "}
							{hotAccountInfo.PreviousTxnLgrSeq}
							<br />
							Sequence: {hotAccountInfo.Sequence}
							<br />
						</div>
					) : (
						<button onClick={getHotAccountInfo}>
							Get Hot Account Info
						</button>
					)}
				</>
			) : (
				<button onClick={createHotWalletAddress}>
					Create Hot Wallet
				</button>
			)}
			{createTrustLineTxResult && (
				<div>
					<h3>
						Trust Line Transaction Result:{" "}
						{createTrustLineTxResult.meta.TransactionResult}
					</h3>
					<h6>Account: {createTrustLineTxResult.Account}</h6>
					<h6>Fee: {createTrustLineTxResult.Fee}</h6>
					<h6>Flags: {createTrustLineTxResult.Flags}</h6>
					<h6>
						Last Ledger Sequence:{" "}
						{createTrustLineTxResult.LastLedgerSequence}
					</h6>
					<h6>
						Currency: {createTrustLineTxResult.LimitAmount.currency}
					</h6>
					<h6>
						Issuer: {createTrustLineTxResult.LimitAmount.issuer}
					</h6>
					<h6>Value: {createTrustLineTxResult.LimitAmount.value}</h6>
					<h6>Sequence: {createTrustLineTxResult.Sequence}</h6>
					<h6>
						Transaction Type:{" "}
						{createTrustLineTxResult.TransactionType}
					</h6>
					<h6>{createTrustLineTxResult.validated && "VALIDATED"}</h6>
				</div>
			)}
			{sendTokenTxResult && (
				<div>
					<h3>
						Send Token Transaction Result:{" "}
						{sendTokenTxResult.meta.TransactionResult}
					</h3>
					<h6>Account From: {sendTokenTxResult.Account}</h6>
					<h6>Account To: {sendTokenTxResult.Destination}</h6>
					<h6>Currency: {sendTokenTxResult.Amount.currency}</h6>
					<h6>Issuer: {sendTokenTxResult.Amount.issuer}</h6>
					<h6>Value: {sendTokenTxResult.Amount.value}</h6>
					<h6>Fee: {sendTokenTxResult.Fee}</h6>
					<h6>Flags: {sendTokenTxResult.Flags}</h6>
					<h6>
						Last Ledger Sequence:{" "}
						{sendTokenTxResult.LastLedgerSequence}
					</h6>
					<h6>Sequence: {sendTokenTxResult.Sequence}</h6>
					<h6>
						Transaction Type: {sendTokenTxResult.TransactionType}
					</h6>
					<h6>{sendTokenTxResult.validated && "VALIDATED"}</h6>
				</div>
			)}
			<br />
			{!trustLineCreated && coldWallet && hotWallet && (
				<button onClick={createTrustLine}>Create Trust Line</button>
			)}
			{hotWallet && trustLineCreated && (
				<>
					<br />
					<button onClick={getHolderTokenBalance}>
						Get Hot Wallet Token Balance
					</button>
				</>
			)}
			{coldWallet && trustLineCreated && (
				<>
					<br />
					<button onClick={getIssuerTokenBalance}>
						Get Cold Wallet Token Balance
					</button>
				</>
			)}
			<br />
			{hotTokenBalances && (
				<>
					<h1>Hot Wallet Balance:</h1>
					<h6>Account: {hotTokenBalances.account}</h6>
					<h6>Trust Line To: {hotTokenBalances.lines[0].account}</h6>
					<h6>Currency: {hotTokenBalances.lines[0].currency}</h6>
					<h6>Balance: {hotTokenBalances.lines[0].balance}</h6>
					<h6>Limit: {hotTokenBalances.lines[0].limit}</h6>
				</>
			)}
			<br />
			{coldTokenBalances && (
				<>
					<h1>Cold Wallet Balance:</h1>
					<h6>Issuer Account: {coldTokenBalances.account}</h6>
					<h6>Issued To Account: {keys}</h6>
					<h6>Currency: {values[0][0].currency}</h6>
					<h6>Value: {values[0][0].value}</h6>
				</>
			)}
			{trustLineCreated && coldWallet && hotWallet && (
				<>
					<button onClick={sendToken}>
						Send Token To Hot Wallet
					</button>
				</>
			)}
			<br />
			<button onClick={clearSessionStorage}>Clear Session Storage</button>
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
