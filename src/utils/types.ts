

export interface swapParams {
    token:string, 
    decimals:number,
    pool:string, 
    dexV:number, 
    liquidity:number, 
    swapAmount:string
}

export interface tradeHistory {
    swapParams: swapParams,
    amountReceivedWei: string,
    buyPrice: number,
    timestamp: number
}

export interface poolLiqWethTk {
    weth: bigint;
    token: bigint;
  }

export interface settings {
    rpc:string;
    wsRpc:string;
    pk: string;
    buyAmount: string;
    holdingDuration: number;
    takeProfit:number;
  }