import Web3 from "web3";
import { config } from "../../config/index";

class EthWeb3 {
    public ETH_RPC_URL: string;
    public BSC_RPC_URL: string;
    public POL_RPC_URL: string;

    public eth_web3: Web3;
    public bsc_web3: Web3;
    public pol_web3: Web3;


    constructor() {
        this.ETH_RPC_URL = config.NODE.ETH_RPC_URL || "";
        this.BSC_RPC_URL = config.NODE.BNB_RPC_URL || "";
        this.POL_RPC_URL = config.NODE.POL_RPC_URL || "";
        this.eth_web3 = new Web3(this.ETH_RPC_URL);
        this.bsc_web3 = new Web3(this.BSC_RPC_URL);
        this.pol_web3 = new Web3(this.POL_RPC_URL);
    }

}

const web3 = new EthWeb3();
export default web3;
