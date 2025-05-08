import { ethers } from 'ethers';
import { config } from "../../config/index";

class EtherJs {
    public ETH_RPC_URL: string;
    public BSC_RPC_URL: string;
    public POL_RPC_URL: string;

    public etherEth: ethers.JsonRpcProvider;
    public etherBsc: ethers.JsonRpcProvider;
    public etherPol: ethers.JsonRpcProvider;


    constructor() {
        this.etherEth = new ethers.JsonRpcProvider(config.NODE.ETH_RPC_URL || "")
        this.etherBsc = new ethers.JsonRpcProvider(config.NODE.BNB_RPC_URL || "")
        this.etherPol = new ethers.JsonRpcProvider(config.NODE.POL_RPC_URL || "")
    }

}

const etherJs = new EtherJs();
export default etherJs;