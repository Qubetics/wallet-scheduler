import { bigNumberSafeMath } from "../common/globalFunctions";
import { ethers } from "ethers";

class blockchain_helper {

    public get_balance = async (address: string, rpc_object: any, inMatic: boolean) => {
        try {
            const balanceInWei = await rpc_object.getBalance(address);
            if (inMatic == true) {
                const balanceInMatic = ethers.formatEther(balanceInWei);
                return balanceInMatic;
            }
            return balanceInWei;
        } catch (err) {
            console.log('🔥 ~ ~ get_balance error', err);
            return null;
        }
    }

    public async getUserERC20TokenBalance(tokenAddress: string | null | undefined, tokenAbi: any, walletAddress: string, rpc_object: any): Promise<number | null> {
        try {
            if (tokenAddress) {
                const contract = new ethers.Contract(tokenAddress, tokenAbi, rpc_object);
                const decimals = await contract.decimals();
                const balance = await contract.balanceOf(walletAddress);
                const tokenBalance = await bigNumberSafeMath(balance, "/", Math.pow(10, decimals));
                return tokenBalance;
            } else {
                return 0;
            }
        } catch (err) {
            console.log("🔥 ~ ~ getUserERC20TokenBalance error", err);
            return null;
        }
    }

    public async searchTokenNew(tokenAddress: string | null | undefined, tokenAbi: any, rpc_object: any) {
        try {
            if (!tokenAddress) throw new Error("ERROR in searchTokenNew ");
            const contract = new ethers.Contract(tokenAddress, tokenAbi, rpc_object);
            const [decimals, name, symbol] = await Promise.all([
              contract.decimals(),
              contract.name(),
              contract.symbol()
            ]);
      
            const data = { 
              decimals: Number(decimals), 
              name, 
              symbol 
            };
            
            if (!data) throw new Error("ERROR in searchTokenNew ");
            return data;
        }
        catch (error) {
            console.error("search_token_new error", error)
            const data = { decimals: 0, name: "", symbol: "" }
            return data;
        }
    }

}

const BlockchainHelper = new blockchain_helper();
export default BlockchainHelper;
