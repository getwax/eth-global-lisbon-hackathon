import { useEffect, useState } from 'react';
import { solG2 } from '@thehubbleproject/bls/dist/mcl';
import PaymentChannel, { Payment } from '../PaymentChannel';
import Transaction from '../components/Transaction';
import AppContext from '../AppContext';
import calculateSignaturesNeeded from '../utils/calculateSignaturesNeeded';
import { IERC20__factory } from '../ERC20/IERC20__factory';
import { AccountAPI } from '../account/AccountAPI';
import assert from '../utils/assert';
import LoadingTransaction from '../components/LoadingTransaction';

export default function Page() {
  const appContext = AppContext.use();
  const [payment, setPayment] = useState<Payment | undefined>();
  const [publicKeys, setPublicKeys] = useState<solG2[]>([]);
  const url = new URL(window.location.href);
  const id = url.searchParams.get('id');

  useEffect(() => {
    const getPaymentData = async () => {
      if (!id) return;
      const channel = new PaymentChannel(id);
      const tempPayment = await channel.getPayment();
      const signedTx = await channel.getSignedPayment();
      setPublicKeys(signedTx.publicKeys);
      setPayment(tempPayment);
    };
    getPaymentData();
  }, []);

  const addSignature = async () => {
    if (!appContext || !payment || !id) return;
    const channel = new PaymentChannel(id);
    await appContext.addSignature(channel, payment);
  };

  const userSigned = publicKeys.find(
    (pk) => pk.join('') === appContext?.signer.pubkey.join(''),
  );

  const sendTransaction = async () => {
    const provider = appContext?.aaProvider;
    const signer = provider?.getSigner();

    assert(id !== null);
    const channel = new PaymentChannel(id);
    const signedTx = await channel.getSignedPayment();

    const accountApi = provider?.smartAccountAPI as AccountAPI;
    accountApi.setNextAggBlsSignature(signedTx.signature);

    if (!payment || !signer) return;
    const ERC20 = IERC20__factory.connect(payment.token, signer);

    const transferTx = await ERC20.transfer(payment.to, payment.amount);
    const reciept = await transferTx.wait();
    console.log('reciept', reciept);
  };

  if (id === null)
    return (
      <div className="space-y-12">
        <div className="border-b border-white/10 pb-12">
          <h2 className="text-base font-semibold leading-7 text-white">
            No transaction to sign!
          </h2>
        </div>
      </div>
    );

  const sigsNeeded = payment && calculateSignaturesNeeded(payment);

  let sigsRemaining: number | undefined = undefined;

  if (sigsNeeded !== undefined) {
    sigsRemaining = sigsNeeded - publicKeys.length;
  }

  return (
    <form>
      <div className="space-y-12">
        <div className="border-b border-white/10 pb-12">
          <h2 className="text-base font-semibold leading-7 text-white">
            Sign Group Transaction
          </h2>
          <p className="mt-1 text-sm leading-6 text-gray-400 pb-6">
            This transaction needs {sigsNeeded ?? '?'} signatures.
          </p>
          {(() => {
            if (
              payment === undefined ||
              sigsNeeded === undefined ||
              sigsRemaining === undefined
            ) {
              return <LoadingTransaction />;
            }

            return (
              <Transaction
                to={payment.to}
                token={payment.token}
                description={payment.description}
                amount={payment.amount}
                numSigned={publicKeys.length}
                sigsNeeded={sigsNeeded}
              />
            );
          })()}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-x-6">
        {userSigned && sigsRemaining !== undefined && sigsRemaining > 0 && (
          <div>You have already signed!</div>
        )}

        {sigsRemaining === 0 && (
          <button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              sendTransaction();
            }}
            className="rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
          >
            Send transaction
          </button>
        )}

        {sigsRemaining !== undefined && !userSigned && (
          <button
            type="submit"
            disabled={!!userSigned}
            onClick={async (e) => {
              e.preventDefault();
              await addSignature();
              window.location.reload();
            }}
            className="rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
          >
            Add signature
          </button>
        )}
      </div>
    </form>
  );
}
