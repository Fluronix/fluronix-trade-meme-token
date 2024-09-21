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
  buyAmount: func.towei(process.env.BUY_AMOUNT_ETH??"0.001", 18),
  holdingDuration: Number(process.env.TOKEN_HOLDING_DURATION??51),
  takeProfit: Number(process.env.TAKE_PROFIT_PERC??5)
}

const provider = new ethers.WebSocketProvider(config.wsRpc);
const UniV3PoolMint = "Mint(address,address,int24,int24,uint128,uint256,uint256)"
const UniV3PoolMintSigBytes = ethers.keccak256(ethers.toUtf8Bytes(UniV3PoolMint)) 
const UniV2PoolMint = "Mint(address,uint256,uint256)"
const UniV2PoolMintSigBytes = ethers.keccak256(ethers.toUtf8Bytes(UniV2PoolMint)) 
const WETH = "0x4200000000000000000000000000000000000006"


const engineModule = new EngineModule(config)

const processTxReceipt = async(txReciept:ethers.TransactionReceipt | null=null , timestamp:number, provider:any) => {
    if(txReciept === null || txReciept?.to === null)return

    const txLogs = txReciept.logs
    //search for liquidity adding tx
    txLogs.forEach(async Log => {
      const [eventAction] = Log.topics // [0x,0x,0x]
      const poolAddress = Log.address
      const contract = func.ERC20contract(poolAddress, provider)
  
      try{
        const [token0, token1, decimals, poolName] = await Promise.all([await contract.token0(), await contract.token1(), await contract.decimals(), await contract.name()])
        const targetToken = func.isWethPair(WETH, [token0,token1])
        if (!targetToken) return // if target token not pair with WETH

        if(poolName.includes("Volatile AMM")) return

        //If uniV2 mint event detected 
        if(eventAction.toLowerCase() === UniV2PoolMintSigBytes.toLowerCase()){
          console.log("token Minted V2 ", poolName,poolAddress)

          //verify liquidity tolerance
          let poolWETHliquidity =  await func.ERC20contract(WETH,engineModule.provider).balanceOf(poolAddress)
          poolWETHliquidity = func.fromwei(poolWETHliquidity, 18)
          if(poolWETHliquidity < 1) return

          //simulate buy and sell of the token
          const simulationPass = await engineModule.simulateBuySell(
            [targetToken, poolAddress, 2], 
            config.buyAmount
          )
          console.log("simulationPass", simulationPass, targetToken)

          if(simulationPass){
            const swapParams:swapParams = {
              token:targetToken,
              decimals: Number(decimals),
              pool:poolAddress,
              dexV:2,
              liquidity:poolWETHliquidity,
              swapAmount: config.buyAmount
            }

            //execute a buy swap
            engineModule.executeSwap(
              swapParams,
              "buy"
            )
          }
        }
        //If uniV3 mint event detected 
        if(eventAction.toLowerCase() === UniV3PoolMintSigBytes.toLowerCase()){
            console.log("token Minted V3 ", poolName ,poolAddress)


          //verify liquidity tolerance
          let poolWETHliquidity =  await func.ERC20contract(WETH,engineModule.provider).balanceOf(poolAddress)
          poolWETHliquidity = func.fromwei(poolWETHliquidity, 18)
          if(poolWETHliquidity < 1) return

          //simulate buy and sell of the token
          const simulationPass = await engineModule.simulateBuySell(
            [targetToken, poolAddress, 3], 
            config.buyAmount
          )
          console.log("simulationPass", simulationPass, targetToken)

          if(simulationPass){
            const swapParams:swapParams = {
              token:targetToken,
              decimals: Number(decimals),
              pool:poolAddress,
              dexV:3,
              liquidity:poolWETHliquidity,
              swapAmount:  config.buyAmount
            }

            //execute a buy swap
            engineModule.executeSwap(
              swapParams,
              "buy"
            )
          }
        }
  
      }catch(err){} 
  
    })
  
  }




provider.on("block", async (blockNumber:ethers.BlockTag) => {
    // Optionally fetch the full block details
    const block = await provider.getBlock(blockNumber)
    block?.transactions.forEach((txhash)=>{
      provider.getTransactionReceipt(txhash).then(receipt =>{
        processTxReceipt(receipt, block?.timestamp??0, provider)
          //process.exit()
      }).catch(err =>console.log(err))
    })
  
})