import { ethers } from "ethers";
import * as func from "./helperfunc"
import getterABI from "./abi/Getter.json"
import swapperABI from "./abi/swapper.json"
import {swapParams, tradeHistory, settings}  from "./types"
import path from "path"


export class  EngineModule {
    
    public provider:ethers.Provider 
    private signer:ethers.Wallet
    private WETH = "0x4200000000000000000000000000000000000006"
    private tradeHistoryJsonPath
    public settings: settings

    constructor(settings: settings){
        this.settings = settings
        this.provider = new ethers.JsonRpcProvider(this.settings.rpc)
        this.signer = new ethers.Wallet(settings.pk, this.provider)
        //this.tradeHistoryJsonPath = path.join(process.cwd(), "./utils/memory/tradeHistory.json") //for ts/nodejs
        this.tradeHistoryJsonPath = path.join(process.cwd(), "./src/utils/memory/tradeHistory.json") //for docker


        
    }

    //swap contract instance
    private swapperContract = (provider:any = this.signer) => new ethers.Contract(
        "0x723cda513301d8c5488651e76B9a0D5CE3C5A42F",
        swapperABI,
        provider
    )

    //Getter contract
    private getterContract = () => new ethers.Contract(
        "0xfd9B8114C56bdC8d58e631B70Bc634c477f8F51c",
        getterABI,
        this.provider
    )

    getETHprice = async ()=>{
        const sqrtPriceX96 = await this.getterContract().getSqrtPriceX96("0xd0b53d9277642d899df5c87a3966a349a798f224")
        const price = 1 / (Number(sqrtPriceX96) / 2**96) ** 2;
        return (10**18 / 10**6) / price
      
      }

    async simulateBuySell(tokenPairDexV:any[], amount:any) {
        //@param fromToPairDexV [TokenAdress, PairAddress, DexVersion:int]
        try{
            const [buyAmountOut, sellAmountOut] = await this.swapperContract(this.signer).simulateBuySell.staticCall(
                [
                    this.WETH, //WETH
                    tokenPairDexV[0],
                    tokenPairDexV[1]
                ], 
                tokenPairDexV[2],
                {value: amount}
            )
            return true
        }catch(err:any){
            //console.log(er)
            if(err.info.error.message.includes("insufficient funds for gas")){
                console.error("INSUFFICIENT WALLET ETH BALANCE")
            }
            return false
        }
    }

    async executeSwap(swapParams:swapParams, side:string="buy"){

        const from:string = side == "buy"? this.WETH : swapParams.token
        const to:string = side == "buy"? swapParams.token :this.WETH
        const txValue = side == "buy"? {value: swapParams.swapAmount} : {}


        let retryCount=0;
        while(true){

            try{
                const swaptx = await this.swapperContract().executeTrade(
                    [from,to, swapParams.pool],
                    swapParams.swapAmount,
                    0,
                    swapParams.dexV,
                    txValue
                )
                const txReceipt = await swaptx.wait()
                // console.log(txReceipt, swapParams)
                //get the balance of the token after swap
                const amountReceivedWei = await func.ERC20contract(swapParams.token, this.provider).balanceOf(this.signer.address)
                //approve token for future sell swap
                if(side == "buy"){
                    await func.ERC20contract(swapParams.token, this.signer).approve(
                        this.swapperContract().target, amountReceivedWei
                    )
                }

                //get the price of the token after swap
                let executedPrice
                if(swapParams.dexV === 2){
                    const [wethTokenLiq, targetTokenLiq] = await this.getterContract().getLiq(
                        swapParams.pool,    //pool address
                        this.WETH,         // weth
                        swapParams.token  // target token
                    )
                    executedPrice = func.calcPriceV2({weth: wethTokenLiq, token:targetTokenLiq}, swapParams.decimals)
                }else{
                    const token0isWeth = (await func.ERC20contract(swapParams.pool, this.provider).token0()).toLowerCase() === this.WETH.toLowerCase()
                    const getSqrtPriceX96 = await this.getterContract().getSqrtPriceX96(swapParams.pool)
                    executedPrice = func.calcPriceV3(Number(getSqrtPriceX96), swapParams.decimals, token0isWeth)
                }

                
                const tradeHistoryJson: tradeHistory[] = JSON.parse(func.openFile(this.tradeHistoryJsonPath)) // return []

                //delete the token properties in trade history if function call is for token sell
                if(side === "sell"){
                    const tokenSoldIndex = tradeHistoryJson.findIndex((history:tradeHistory)=>history.swapParams.token.toLowerCase() === swapParams.token.toLowerCase())

                    let tokenSold: tradeHistory|undefined = undefined
                    if(tokenSoldIndex !== -1){ // make sure the token is found in tradeHistoryJson
                        tokenSold = tradeHistoryJson[tokenSoldIndex]
                        tradeHistoryJson.splice(tokenSoldIndex, 1)

                    }
                    //save trade history json 
                    func.saveFile(this.tradeHistoryJsonPath, JSON.stringify(tradeHistoryJson))

                    if(tokenSold){
                        // const amountReceivedWei  = tokenSold.amountReceivedWei
                        const buyPrice = tokenSold.buyPrice
                        // const decimals  = tokenSold.swapParams.decimals
                        const sellPrice = executedPrice

                        console.log(`Token sell successfull @
Buy Price: ${buyPrice}
Sell Price ${sellPrice}`)

                    }
                    return true
                }
                else{
                    const tradeHistory: tradeHistory = {
                        swapParams: swapParams,
                        amountReceivedWei: amountReceivedWei.toString(),
                        buyPrice: executedPrice,
                        timestamp: Math.floor(new Date().getTime() / 1000) // timestamp in seconds
                    }
                    tradeHistoryJson.push(tradeHistory)
                    //save trade history json 
                    func.saveFile(this.tradeHistoryJsonPath, JSON.stringify(tradeHistoryJson))
                    console.log("purchase succesfull")
                    console.table({
                        token: swapParams.token,
                        pool: swapParams.pool,
                        buyPrice: executedPrice,
                        amount: func.fromwei(amountReceivedWei, swapParams.decimals)
                    })
                    return true
                }
            }catch(err:any){
                // console.log("executeSwap",err)
                // if transaction revert then retry 5 more times
                if(err.shortMessage === "transaction execution reverted" && retryCount < 5){
                    retryCount += 1
                    continue
                    
                }
                //if tx revert due to another tx executing when the previous is not complete then keep retring
                if(err.shortMessage=== 'replacement fee too low'){
                    continue
                }
                if(err.shortMessage === "insufficient funds for intrinsic transaction cost"){
                    console.error("INSUFFICIENT WALLET ETH BALANCE")
                }
                return false

            }

        } 

    }

    async historyManage(){

        const holdingDurationSecond = this.settings.holdingDuration
        const takeProfitPerc = this.settings.takeProfit

        const tradeHistoryJson:tradeHistory[] = JSON.parse(func.openFile(this.tradeHistoryJsonPath))

        tradeHistoryJson.forEach(async(tradeHistory:tradeHistory)=>{

            const currentTimestamp = Math.floor(new Date().getTime() / 1000) // timestamp in seconds
            const durationInSeconds = Math.abs(currentTimestamp - tradeHistory.timestamp)

            try{
                //get the current price of the token 
                let currentPrice
                if(tradeHistory.swapParams.dexV === 2){
                    const [wethTokenLiq, targetTokenLiq] = await this.getterContract().getLiq(
                        tradeHistory.swapParams.pool,    //pool address
                        this.WETH,                      // weth
                        tradeHistory.swapParams.token  // target token
                    )
                    currentPrice = func.calcPriceV2({weth: wethTokenLiq, token:targetTokenLiq}, tradeHistory.swapParams.decimals)
            
                }else{
                    const token0isWeth = (await func.ERC20contract(tradeHistory.swapParams.pool, this.provider).token0()).toLowerCase() === this.WETH.toLowerCase()
                    const getSqrtPriceX96 = await this.getterContract().getSqrtPriceX96(tradeHistory.swapParams.pool)
                    currentPrice = func.calcPriceV3(Number(getSqrtPriceX96), tradeHistory.swapParams.decimals, token0isWeth)
                }

                const tokenAmountPurchased = func.fromwei(tradeHistory.amountReceivedWei, tradeHistory.swapParams.decimals)
                const tokenInitialETHValue = Number(tokenAmountPurchased) * tradeHistory.buyPrice
                const tokenCurrentETHValue = Number(tokenAmountPurchased) * currentPrice

                const profit = tokenCurrentETHValue - tokenInitialETHValue
                const profitPerc = func.percent_of_x_in_y(profit, tokenInitialETHValue)
                

                console.table({
                    token: tradeHistory.swapParams.token,
                    tokenAmountPurchased: tokenAmountPurchased,
                    tokenInitialETHValue: tokenInitialETHValue,
                    tokenCurrentETHValue: tokenCurrentETHValue,
                    profit: profit,
                    profitPerc: profitPerc.toFixed(3),
                    durationInSeconds: durationInSeconds


                })
                
                if(profitPerc >= takeProfitPerc || durationInSeconds >= holdingDurationSecond){
                    tradeHistory.swapParams.swapAmount = tradeHistory.amountReceivedWei
                    const soldoff = await this.executeSwap(tradeHistory.swapParams, "sell")

                    if(soldoff){
                        console.table({
                            token:tradeHistory.swapParams.token,
                            profit:profit.toFixed(13)+ ` ETH.  (${(profit* await this.getETHprice()).toFixed(5)} USDT)` ,
                            profitPerc: profitPerc.toFixed(4)+" %",
                            duration: durationInSeconds+ " seconds",
                        })
                    }
                }
            }catch(err){
                console.log("tradeHistoryJson.forEach", err)

            }

            //remove a token that has pass the holding duration by 60 secs if bot is unable to sell it
            if(durationInSeconds > holdingDurationSecond + 60){
                let H = tradeHistoryJson
                const expiredTokenIndex = H.findIndex((history:tradeHistory)=>{
                    return history.swapParams.token.toLowerCase() === tradeHistory.swapParams.token.toLowerCase()
                })
                if(expiredTokenIndex !== -1){
                    H.splice(expiredTokenIndex, 1)
                    func.saveFile(this.tradeHistoryJsonPath, JSON.stringify(H))
                    return
                }
            }
        })

        
    }

}