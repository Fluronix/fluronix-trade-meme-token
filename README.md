# fluronix-trade-meme-token

Fluronix Trade Meme Token is an automated trading bot designed to trade newly launched tokens on basechain decentralized exchanges (DEXes). Its key objective is to make quick profits, even in scenarios where the token may be a scam or where liquidity might soon be removed. The bot is programmed to buy and sell tokens in under 51 seconds to mitigate risks and capture profits before market conditions deteriorate.

# Features

•	Fast Trading Execution: The bot executes buy and sell orders in less than 51 seconds.

•	Scam Resistance: Capable of operating in high-risk environments where liquidity might be removed or tokens might be scams.

•	Automated Token Trading: Designed to interact with newly launched tokens, making quick trades for profit opportunities.

•	Customizable Parameters: Modify trading strategies to suit your risk tolerance and market preferences.

# Installation

Video guide:https://youtu.be/2WZXnU1de7E?si=0Dq0KmCOmsHmUQBq
Discord:https://discord.com/invite/ybbKsCUWCn
website:https://fluronix.com/

  Clone the repository and then:
  
     cd fluronix-trade-meme-token
  
# Config
Navigate to the src directory and open the .env file

1. BUY_AMOUNT_ETH = this is the amount of ETH to buy new listed tokens
2. TOKEN_HOLDING_DURATION =  this is the duration in seconds your bot should hold any token
3. TAKE_PROFIT_PERC = this is the percentage of price movement in which your bot will sell off the token 
4. RPC_URL = this is the base node RPC url (note the default url might be down at any anytime)
5. WS_RPC = this is the base node WS url (note the default url might be down at any anytime)
6. PRIVATE_KEY = this is where you set your wallet private  key (note: keep it secret)

# Usage
1. Runing using docker:
	On the root directory run with --build to make a docker image off the root directory
	
	   docker compose up --build

	 Stop bot
	
	    docker compose down 
	
	restart bot
	
	    docker compose up
	
	run in the background
	
	    docker compose up -d

   	You can use docker desktop to manage your containers but note that if you edit your .env file then you have to use docker compose up to restart your containers for the effect to take place.

2. Runing using your local environment:
 	Copy the configured .env file of the /src and replace with the one in /dist directory.

	Then on the root directory run
		
		   npm install
	       npm install typescript -g
   
	Navigate to the src/utils and open the bot_engine_module.ts comment line 22 and comment out line 21.
	
	Navigate to root and change the outDir value from "./src" to "./dist" on the tsconfig.json (line 58) and then run
		
		tsc

	then cd to dist and run
		
		node main.js
	then open another terminal and run

	        node histmanage.js

