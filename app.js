window.addEventListener('load', () => {
    const approveButton = document.getElementById('approve-button');
    const statusElement = document.getElementById('status');

    approveButton.addEventListener('click', async () => {
        if (!window.keplr) {
            statusElement.textContent = "Error: Keplr Wallet not found.";
            statusElement.style.color = "red";
            return;
        }

        const chainId = "uni-6";
        const restUrl = "https://lcd.uni.juno.deuslabs.fi";

        const chainInfo = {
            chainId: chainId,
            chainName: "Juno Testnet",
            rpc: "https://rpc.uni.juno.deuslabs.fi",
            rest: restUrl,
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
            await window.keplr.experimentalSuggestChain(chainInfo);
            await window.keplr.enable(chainId);

            const offlineSigner = window.keplr.getOfflineSignerOnlyAmino(chainId);
            const accounts = await offlineSigner.getAccounts();
            const senderAddress = accounts[0].address;

            statusElement.textContent = "Preparing transaction...";
            statusElement.style.color = "#333";

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

            // Fetch account details for sequence and account number
            const accountUrl = `${restUrl}/cosmos/auth/v1beta1/accounts/${senderAddress}`;
            const accountResponse = await fetch(accountUrl);
            const accountDetails = await accountResponse.json();
            const sequence = accountDetails.account.sequence;
            const accountNumber = accountDetails.account.account_number;

            const signDoc = {
                chain_id: chainId,
                account_number: accountNumber.toString(),
                sequence: sequence.toString(),
                fee: fee,
                msgs: [msg],
                memo: memo,
            };

            const { signed, signature } = await window.keplr.signAmino(chainId, senderAddress, signDoc);

            const tx = {
                msg: signed.msgs,
                fee: signed.fee,
                signatures: [signature],
                memo: signed.memo,
            };

            const txBroadcast = { tx: tx, mode: 'sync' };

            statusElement.textContent = "Broadcasting transaction...";

            const broadcastResponse = await fetch(`${restUrl}/txs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(txBroadcast),
            });

            const broadcastResult = await broadcastResponse.json();

            if (broadcastResult.code) {
                throw new Error(broadcastResult.raw_log);
            }

            statusElement.textContent = `Success! Tx Hash: ${broadcastResult.txhash}`;
            statusElement.style.color = "green";

        } catch (error) {
            statusElement.textContent = `Error: ${error.message}`;
            statusElement.style.color = "red";
            console.error(error);
        }
    });
});