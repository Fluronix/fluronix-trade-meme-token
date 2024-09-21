import { ethers } from "ethers";
import * as func from "./utils/helperfunc"
import {swapParams, settings}  from "./utils/types"
import {EngineModule} from "./utils/bot_engine_module"
import dotenv  from 'dotenv';
// Load environment variables
dotenv.config();



const config: settings ={
  rpc: process.env.RPC_URL??"",
  wsRpc: process.env.WS_RPC??"",
  pk: process.env.PRIVATE_KEY??"",
  buyAmount: func.towei(process.env.BUY_AMOUNT_ETH??"0.0001", 18),
  holdingDuration: Number(process.env.TOKEN_HOLDING_DURATION??51),
  takeProfit: Number(process.env.TAKE_PROFIT_PERC??5)
}

const engineModule = new EngineModule(config)



async function main(){
    while(true){
        try{
            await (engineModule.historyManage())
        }catch(err){

        }
        
        //console.log("test", x)
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 seconds delay
    }
    
    

}
main() 

