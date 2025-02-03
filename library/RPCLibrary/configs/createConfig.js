function createConfig(chainId){
    return {
            chainId:chainId,
            name: "Local",
            rpcs:["http://54.159.212.213:8545"],
            contracts:{
                'raachouseprices':{
                id:'raachouseprices',
                name:'RAAC House Prices',
                contract:''
            },
            'raacminter':{
                id:'raacminter',
                name:'RAAC Minter',
                contract:''
            },
            'raacvault':{
                id:'raacvault',
                name:'RAAC Vault',
                contract:''
            },
            'marketcreator':{
                id:'marketcreator',
                name:'Market Creator',
                contract:''
            },
            'nftliquidator':{
                id:'nftliquidator',
                name:'NFT Liquidator',
                contract:''
            },
            'veraacdistributor':{
                id:'veraacdistributor',
                name:'VERAAC Distributor',
                contract:''
            },
            'raacforclosurelane':{
                id:'raacforclosurelane',
                name:'RAAC Forclosure Lane',
                contract:''
            },
            'auctionfactory':{
                id:'auctionfactory',
                name:'Auction Factory',
                contract:''
            },
            'zenofactory':{
                id:'zenofactory',
                name:'Zeno Factory',
                contract:''
            },
        },
        pools:{
            'stabilitypool':{
                id:'stabilitypool',
                name:'Stability Pool',
                contract:''
            },
            'liquiditypool':{
                id:'liquiditypool',
                name:'Liquidity Pool',
                contract:''
            },
            'lendingpool':{
                id:'lendingpool',
                name:'Lending Pool',
                contract:''
            }
        },
        nfts:{
            'raacnft':{
                id:'raacnft',
                name:'RAAC NFT',
                contract:''
            }
        },
        assets:{
            'eth':{
                'id':'eth',
                'name':'ETH',
                'decimals':18,
                'contract':'0x0000000000000000000000000000000000000000',
            },
            'crvusd':{
                'id':'crvusd',
                'name':'CRVUSD',
                'decimals':18,
                'contract':'',
            },
            'rcrvusd':{
                'id':'rcrvusd',
                'name':'CRVUSD',
                'decimals':18,
                'contract':'',
            },
            'decrvusd':{
                'id':'decrvusd',
                'name':'CRVUSD',
                'decimals':18,
                'contract':'',
            },
            'raactoken':{
                'id':'raactoken',
                'name':'RAAC',
                'decimals':18,
                'contract':'',
            },
            'veraac':{
                'id':'veraac',
                'name':'VERAAC',
                'decimals':18,
                'contract':'',
            },

        }
    }
}

export default createConfig;