export default {
	tgeConfig: {
		wallets: [
			{
				identifier: "deployer",
				type: "deployer",
				address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
				amount: "1000000",
				schedules: [
				{
					type: "linear",
					start: Math.floor(Date.now() / 1000), // now
					end: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
				},
			],
		},
		{
			identifier: 'olddeployer',
			type: 'team',
			address: '0xD7E00713fD4C7D0b17adD50416a4B42C71ec049C',
			amount: '1000000',
			schedules: [
				{
					type: "linear",
					start: Math.floor(Date.now() / 1000), // now
					end: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
				},
			],
		},
		{
			identifier: "team1",
			type: "team",
			address: "0x2549E2E821E3413E6C0235318E3799263E643013",
			amount: "1000000"
		},
		{
			identifier: "team2",
			type: "team",
			address: "0xc6822649A9959C0a45c092a329C77d16F5978426",
			amount: "1000000",
		},
		{
			identifier: "team3",
			type: "team",
			address: "0x55306063058fBF8D658DE8eB074b87898cF5Cf49",
			amount: "2433333.33330",
			schedules: [
				{
					type: "linear",
					start: Math.floor(Date.now() / 1000), // now
					end: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
				},
			],
		},
		{
			identifier: "team4",
			type: "team",
			address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
				amount: "2433333.33330",
			},
		],
		// Need to match the total amount of wallets
		initialSupply: "8866666666600000000000000",
		// Address of the deployer
		owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
		// Address of the faucet
		faucet: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
	}
};
