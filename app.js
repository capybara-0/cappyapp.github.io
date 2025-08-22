import { SigningStargateClient } from "@cosmjs/stargate";
import { Registry } from "@cosmjs/proto-signing";

window.addEventListener('load', () => {
    const approveButton = document.getElementById('approve-button');
    const statusElement = document.getElementById('status');

    approveButton.addEventListener('click', async () => {
        console.log('Approve button clicked');
        if (!window.keplr) {
            statusElement.textContent = "Error: Keplr Wallet not found.";
            statusElement.style.color = "red";
            console.error('Keplr not found');
            return;
        }
        console.log('Keplr found');

        const chainId = "mocha-4";

        const chainInfo = {
            chainId: chainId,
            chainName: "Celestia Mocha Testnet",
            rpc: "https://celestia-testnet-rpc.polkachu.com",
            bip44: { coinType: 118 },
            bech32Config: {
                bech32PrefixAccAddr: "celestia",
                bech32PrefixAccPub: "celestiapub",
                bech32PrefixValAddr: "celestiavaloper",
                bech32PrefixValPub: "celestiavaloperpub",
                bech32PrefixConsAddr: "celestiavalcons",
                bech32PrefixConsPub: "celestiavalconspub",
            },
            currencies: [{ coinDenom: "TIA", coinMinimalDenom: "utia", coinDecimals: 6 }],
            feeCurrencies: [{ coinDenom: "TIA", coinMinimalDenom: "utia", coinDecimals: 6 }],
            stakeCurrency: { coinDenom: "TIA", coinMinimalDenom: "utia", coinDecimals: 6 },
            gasPriceStep: { low: 0.01, average: 0.02, high: 0.03 },
        };

        try {
            console.log('Suggesting chain');
            await window.keplr.experimentalSuggestChain(chainInfo);
            console.log('Chain suggested');

            console.log('Enabling chain');
            await window.keplr.enable(chainId);
            console.log('Chain enabled');

            console.log('Getting offline signer');
            const offlineSigner = window.keplr.getOfflineSignerOnlyAmino(chainId);
            console.log('Offline signer obtained');

            console.log('Getting accounts');
            const accounts = await offlineSigner.getAccounts();
            const senderAddress = accounts[0].address;
            console.log('Accounts obtained:', senderAddress);

            statusElement.textContent = "Preparing transaction...";
            statusElement.style.color = "#333";

            // Connect to the RPC endpoint
            const rpcEndpoint = chainInfo.rpc;
            const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, offlineSigner);

            // Get account details using RPC
            console.log('Fetching account details via RPC');
            const account = await client.getAccount(senderAddress);
            if (!account) {
                throw new Error("Account not found on chain.");
            }
            const accountNumber = account.accountNumber;
            const sequence = account.sequence;
            console.log('Account details fetched:', { accountNumber, sequence });

            const msg = {
                type: "cosmos-sdk/MsgSend",
                value: {
                    from_address: senderAddress,
                    to_address: "celestia1jjsduzgd4euahh208rv2p53y2w5heggy5cgkh5",
                    amount: [{ denom: "utia", amount: "100" }],
                },
            };

            const fee = { amount: [{ denom: "utia", amount: "5000" }], gas: "200000" };
            const memo = "Transaction from Godot DApp";

            // Sign and broadcast the transaction using RPC
            console.log('Signing and broadcasting transaction');
            const result = await client.signAndBroadcast(
                senderAddress,
                [msg],
                fee,
                memo
            );
            console.log('Transaction broadcasted', result);

            if (result.code !== undefined && result.code !== 0) {
                throw new Error(result.rawLog);
            }

            statusElement.textContent = `Success! Tx Hash: ${result.transactionHash}`;
            statusElement.style.color = "green";

        } catch (error) {
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.style.color = "red";
            console.error('An error occurred:', error);
        }
    });
});
