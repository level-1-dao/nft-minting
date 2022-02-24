Initial Project SetUp
1.  git clone, yarn to add deps
2.  ONE TIME ONLY: create .env at root and add `GENERATE_SOURCEMAP=false`
   


Start Local Development   
1.  `yarn ganache` to start local chain
2.  open another terminal and `npx gsn start` to start local GSN
3.  delete any existing files inside in src/localGSNbuilds. copy all 6 json files from build/gsn into src/localGSNbuilds
4.  in a third terminal `truffle deploy`
5.  in a fourth terminal `yarn start` to open in browser
6.  Make sure Metamask is connect to localhost:8545
7.  open console to see processes/logs
8. some of the rendering is buggy, possibly will need to refresh page to get button to work
