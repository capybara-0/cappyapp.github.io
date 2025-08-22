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

        const chainId = "uni-6";

        const chainInfo = {
            chainId: chainId,
            chainName: "Juno Testnet",
            rpc: "https://juno-rpc.polkachu.com/",
            bip44: { coinType: 118 },
            bech32Config: {
                bech32PrefixAccAddr: "juno",
                bech32PrefixAccPub: "junopub",
                bech32PrefixValAddr: "junovaloper",
                bech32PrefixValPub: "junovaloperpub",
                bech32PrefixConsAddr: "junovalcons",
                bech32PrefixConsPub: "junovalconspub",
            },
            currencies: [{ coinDenom: "JUNOX", coinMinimalDenom: "ujunox", coinDecimals: 6 }],
            feeCurrencies: [{ coinDenom: "JUNOX", coinMinimalDenom: "ujunox", coinDecimals: 6 }],
            stakeCurrency: { coinDenom: "JUNOX", coinMinimalDenom: "ujunox", coinDecimals: 6 },
            gasPriceStep: { low: 0.03, average: 0.04, high: 0.05 },
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
                    to_address: "juno1ws42s7arrx94gchj6t42s42eg22j82zspqjwj3",
                    amount: [{ denom: "ujunox", amount: "100" }],
                },
            };

            const fee = { amount: [{ denom: "ujunox", amount: "5000" }], gas: "200000" };
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