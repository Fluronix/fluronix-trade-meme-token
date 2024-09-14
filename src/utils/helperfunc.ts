import { ethers } from "ethers";
import  fs from "fs"
import {poolLiqWethTk} from "./types"

//READ FILE
export function openFile(fPath:string) {
    return fs.readFileSync(fPath, "utf8");

}
export function saveFile(fPath:string, fileToSave:any) {
  try {
    fs.writeFileSync(fPath, fileToSave);
    return true;
  } catch (error) {
    return error;
  }
}

export const x_percent_of_y = (x:number, y:number) => (x / 100) * y 
export const percent_of_x_in_y = (x:number, y:number) => (x / y) * 100 


export const erc20ABI:string[]  = [
    "function decimals() external view returns (uint8)",
    "function approve(address spender, uint256 value) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function transfer(address to, uint256 value) external returns (bool)",
    "function name() public view returns (string memory)",
    "function symbol() public view  returns (string memory)",
    //WETH abi
    "function withdraw(uint wad) public",
    "function deposit() public payable",
    //Pool contract abi
    "function token0() external view returns (address)",
    "function token1() external view returns (address)"
]
export const ERC20contract = (addr:string, provider:any) => new ethers.Contract(addr, erc20ABI, provider)

//Check if WETH is included in pair
export const isWethPair = (WETH:string, token01:string[]): string|undefined=>{
    //**If WETH addr is in token0 return token1 verse versa  else return none*/
    if(token01[0].toLocaleLowerCase() === WETH.toLocaleLowerCase()){
        return token01[1]
    }
    else if (token01[1].toLocaleLowerCase() === WETH.toLocaleLowerCase()){
        return token01[0]
    }

    return undefined
}

//convert human to wei
export const towei = (amount:string, decimals:number) =>
    ethers.parseUnits(amount, decimals).toString();
//convert from wei to human
export const fromwei = (amount:string, decimals:number) =>
  ethers.formatUnits(amount, decimals).toString();


export function calcPriceV2(poolLiqWethTk: poolLiqWethTk, decimal:number): number {
// Calculate prices
    const price = parseFloat(fromwei(poolLiqWethTk.weth.toString(), 18)) /  parseFloat(fromwei(poolLiqWethTk.token.toString(), decimal))
    return price 
}
  
export function calcPriceV3(sqrtPriceX96: number, decimal:number, tk0IsWeth:boolean): number {
// const ratio =  poolLiqWethTk.weth / poolLiqWethTk.token
// const sqrtPriceX96 = Math.sqrt(ratio) * Math.pow(2, 96)
/**
* @doc https://blog.uniswap.org/uniswap-v3-math-primer
* @dev adjustment: one token1 == x token0 :. (1 / (sqrtPriceX96 / 2**96) **2)
*/
const price = 1 / (sqrtPriceX96 / 2**96) **2
const formatedPrice10 = price / (10**18 / 10**decimal) //one token1 == x token0
const formatedPrice01 = (10**decimal / 10**18 ) / price //one token0 == x token1
return tk0IsWeth ? formatedPrice10: formatedPrice01

}

