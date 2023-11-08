import React, { useEffect, useState } from "react";
import { NumericInput } from "../base/numeric-input";
import { PoolKeyId } from "../base/pool-key";
import { isError } from "util";
import { formatEther, parseEther } from "viem";
import { useAccount, useChainId } from "wagmi";
import {
  counterAddress,
  poolModifyPositionTestAddress,
  useErc20Allowance,
  useErc20Approve,
  usePoolModifyPositionTestModifyPosition,
} from "~~/generated/generated";
import { TOKEN_ADDRESSES } from "~~/utils/config";
import { MAX_UINT } from "~~/utils/constants";
import { notification } from "~~/utils/scaffold-eth";

function LiquidityComponent() {
  const chainId = useChainId();
  const { address: walletAddress } = useAccount();

  // Token & Wallet Configuration
  // TODO: allow users to select tokens?
  const token0Addr = TOKEN_ADDRESSES[0][chainId as keyof (typeof TOKEN_ADDRESSES)[0]];
  const token1Addr = TOKEN_ADDRESSES[1][chainId as keyof (typeof TOKEN_ADDRESSES)[1]];
  const lpRouterAddress = poolModifyPositionTestAddress[chainId as keyof typeof poolModifyPositionTestAddress];

  // State Variables
  const [swapFee, setSwapFee] = useState(3000n);
  const [tickSpacing, setTickSpacing] = useState(60n);
  const [hookAddress, setHookAddress] = useState<`0x${string}`>(counterAddress[chainId as keyof typeof counterAddress]);

  const [tickLower, setTickLower] = useState(-(tickSpacing * 10n));
  const [tickUpper, setTickUpper] = useState(tickSpacing * 10n);
  const [liquidityDelta, setLiquidityDelta] = useState(parseEther("1000"));
  const [hookData, setHookData] = useState<`0x${string}`>("0x");
  // Add loading states for UI feedback

  const [isApprovingToken0, setIsApprovingToken0] = useState(false);
  const [isApprovingToken1, setIsApprovingToken1] = useState(false);
  const [token0Approved, setToken0Approved] = useState(false);
  const [token1Approved, setToken1Approved] = useState(false);

  const { data: token0Allowance, refetch: refetchT0Allowance } = useErc20Allowance({
    address: token0Addr,
    args: [walletAddress ?? "0x0", lpRouterAddress],
  });

  const { data: token1Allowance, refetch: refetchT1Allowance } = useErc20Allowance({
    address: token1Addr,
    args: [walletAddress ?? "0x0", lpRouterAddress],
  });

  const {
    writeAsync: writeToken0Approve,
    error: errorToken0Approve,
    isLoading: isLoadingToken0,
    isError: isErrorToken0,
    isSuccess: isSuccesTokenO,
  } = useErc20Approve({
    address: token0Addr,
    args: [lpRouterAddress, MAX_UINT],
  });

  const { writeAsync: writeToken1Approve, error: errorToken1Approve } = useErc20Approve({
    address: token1Addr,
    args: [lpRouterAddress, MAX_UINT],
  });

  const {
    writeAsync: writeModifyPosition,
    error: errorModifyPosition,
    isError: isErrorModifyPos,
    isLoading: isLoadingModifyPos,
  } = usePoolModifyPositionTestModifyPosition({
    args: [
      {
        currency0: token0Addr < token1Addr ? token0Addr : token1Addr,
        currency1: token0Addr < token1Addr ? token1Addr : token0Addr,
        fee: Number(swapFee),
        tickSpacing: Number(tickSpacing),
        hooks: hookAddress,
      },
      {
        tickLower: Number(tickLower),
        tickUpper: Number(tickUpper),
        liquidityDelta: liquidityDelta,
      },
      hookData || "0x00",
    ],
  });

  const handleInitialize = async () => {
    try {
      await writeModifyPosition();
    } catch (error) {
      notification.error(
        <div className="text-left">
          Error Provisioning Liquidity
          {errorModifyPosition?.message}
          {error?.message}
        </div>,
      );
    }
  };

  const handleToken0Approve = async () => {
    setIsApprovingToken0(true);
    try {
      await writeToken0Approve();
      refetchT0Allowance();
      setIsApprovingToken0(false);
      setToken0Approved(true); // Set approved status on successful approval
    } catch (error) {
      setIsApprovingToken0(false);
      notification.error(
        <div className="text-left">
          Error Approving Token0
          {errorToken0Approve?.message}
        </div>,
      );
    }
  };

  const handleToken1Approve = async () => {
    setIsApprovingToken1(true);
    try {
      await writeToken1Approve();
      refetchT1Allowance();
      setIsApprovingToken1(false);
      setToken1Approved(true); // Set approved status on successful approval
    } catch (error) {
      setIsApprovingToken1(false);
      notification.error(
        <div className="text-left">
          Error Approving Token1
          {errorToken1Approve?.message}
        </div>,
      );
    }
  };

  useEffect(() => {
    setHookAddress(counterAddress[chainId as keyof typeof counterAddress]);
  }, [chainId]);

  return (
    <div className="card shadow-2xl p-6 bg-white rounded-xl border-2 border-pink-400 min-w-[34rem] max-w-xl transition-shadow hover:shadow-none">
      <h2 className="text-2xl font-bold mb-2">Provision Liquidity</h2>
      <p className="text-gray-600 mb-6">Fill out the details below to provision liquidity to a pool. .</p>
      <PoolKeyId
        swapFee={swapFee}
        setSwapFee={setSwapFee}
        tickSpacing={tickSpacing}
        setTickSpacing={setTickSpacing}
        hookAddress={hookAddress}
        setHookAddress={setHookAddress}
      />

      <div className="grid grid-cols-2 gap-2">
        <NumericInput
          type="number"
          placeholder="Lower Bound"
          tooltipText="Lower bound of the price range."
          value={Number(tickLower)}
          onChange={e => setTickLower(BigInt(e.target.value))}
        />

        <NumericInput
          type="number"
          placeholder="Upper Bound"
          tooltipText="Upper bound of the price range."
          value={Number(tickUpper)}
          onChange={e => setTickUpper(BigInt(e.target.value))}
        />
      </div>

      <NumericInput
        type="number"
        placeholder="Liquidity Delta"
        tooltipText="Amount of liquidity to add/remove."
        value={Number(formatEther(liquidityDelta))}
        onChange={e => setLiquidityDelta(parseEther(String(e.target.value)))}
      />

      <NumericInput
        type="text"
        placeholder="Hook Data"
        tooltipText="Data to pass to the hook."
        value={hookData}
        onChange={e => setHookData(e.target.value as `0x${string}`)}
      />

      <div className="grid w-full grid-cols-2 gap-4">
        {(token0Allowance < liquidityDelta || token0Allowance === 0n) && !token0Approved && (
          <button
            className={`btn btn-primary w-full transition-all mt-4 ${isApprovingToken0 ? "loading" : ""}`}
            onClick={handleToken0Approve}
            disabled={isApprovingToken0}
          >
            {isApprovingToken0 ? "Approving..." : "Approve Token0"}
          </button>
        )}
        {(token0Approved || token0Allowance > liquidityDelta) && (
          <button className="btn btn-secondary w-full transition-all mt-4" disabled>
            Approved
          </button>
        )}

        {(token1Allowance < liquidityDelta || token1Allowance === 0n) && !token1Approved && (
          <button
            className={`btn btn-primary w-full transition-all mt-4 ${isApprovingToken1 ? "loading" : ""}`}
            onClick={handleToken1Approve}
            disabled={isApprovingToken1}
          >
            {isApprovingToken1 ? "Approving..." : "Approve Token1"}
          </button>
        )}

        {(token1Approved || token1Allowance > liquidityDelta) && (
          <button className="btn btn-secondary w-full transition-all mt-4" disabled>
            Approved
          </button>
        )}
      </div>

      <button
        className={`btn  btn-primary w-full hover:bg-indigo-600 hover:shadow-lg active:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all mt-4 
        ${isErrorModifyPos ? "bg-red-500 hover:bg-red-600" : ""}
        `}
        onClick={handleInitialize}
        disabled={isLoadingModifyPos}
      >
        {isLoadingModifyPos ? (
          <>
            <svg
              aria-hidden="true"
              class="w-8 h-8 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
            Processing...
          </>
        ) : (
          <>Add Liquidity</>
        )}
      </button>
    </div>
  );
}

export default LiquidityComponent;
