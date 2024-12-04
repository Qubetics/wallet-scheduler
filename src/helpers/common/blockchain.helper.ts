import { AbiItem } from "web3-utils";
import { bigNumberSafeMath } from "../common/globalFunctions";
class blockchain_helper {

    public get_balance = async (address: string, rpc_object: any, inMatic: boolean) => {
        try {
            const balanceInWei = await rpc_object.eth.getBalance(address);
            if (inMatic == true) {
                const balanceInMatic = rpc_object.utils.fromWei(balanceInWei, "ether");
                return balanceInMatic;
            }
            return balanceInWei;
        } catch (err) {
            console.log('🔥 ~ ~ get_balance error', err);
            // throw err;
            return null;
        }
    }

    public async getUserERC20TokenBalance(tokenAddress: string | null | undefined, tokenAbi: AbiItem[], walletAddress: string, rpc_object: any): Promise<number | null> {
        try {
            if (tokenAddress) {
                const contract = await new rpc_object.eth.Contract(tokenAbi, tokenAddress);
                const decimals = await contract.methods.decimals().call();
                const balance = await contract.methods.balanceOf(walletAddress).call();
                const tokenBalance = await bigNumberSafeMath(balance, "/", Math.pow(10, decimals));
                return tokenBalance;
            } else {
                return null;
            }
        } catch (err) {
            console.log("🔥 ~ ~ getUserERC20TokenBalance error", err);
            return null;
        }
    }

    public async searchTokenNew(tokenAddress: string | null | undefined, tokenAbi: AbiItem[], rpc_object: any) {
        try {
            const contract = new rpc_object.eth.Contract(tokenAbi, tokenAddress);
            const decimals = await contract.methods.decimals().call();
            const name = await contract.methods.name().call();
            const symbol = await contract.methods.symbol().call();
            const data = { decimals, name, symbol };
            if (!data) {
                throw new Error("ERROR in searchTokenNew ");
            } else {
                return data;
            }
        }
        catch (error) {
            console.error("search_token_new error", error)
            const data = { decimals: 0, name: "", symbol: "" }
            return data;
        }
    }
    public async return_decimals(address: string, coin_family: number, tokenAbi: AbiItem[], rpc_object: any) {
        try {

            if (coin_family == 2 || coin_family == 1) {
                let token_data: any = await this.searchTokenNew(address, tokenAbi, rpc_object)
                return Math.pow(10, parseInt(token_data?.decimals))
            } else {
                // console.log("Invalid Coin_Family")
                return 0;
            }
        } catch (err: any) {
            console.error("err in return_decimals", err);
            return 0;
        }
    }

}

const BlockchainHelper = new blockchain_helper();
export default BlockchainHelper;
