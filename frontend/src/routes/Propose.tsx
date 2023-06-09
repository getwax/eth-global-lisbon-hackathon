import { FormEvent, useState } from 'react';
import AppContext from '../AppContext';
import calculateSignaturesNeeded from '../utils/calculateSignaturesNeeded';
import { Payment } from '../PaymentChannel';
import { ethers } from 'ethers';
import PaymentChannel from '../PaymentChannel';
import { useNavigate } from 'react-router-dom';

export default function Propose() {
  const appContext = AppContext.use();

  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');

  let payment: Payment | undefined;

  if (!Number.isNaN(parseFloat(amount)) && address) {
    payment = appContext?.createPayment({
      to: address,
      amount: ethers.utils.parseEther(amount).toHexString(),
      description: 'test',
    });
  }

  const signaturesNeeded = payment && calculateSignaturesNeeded(payment);

  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!payment) {
      return;
    }

    const paymentChannel = await PaymentChannel.create(payment);
    navigate(`/sign?id=${paymentChannel.id}`);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="space-y-12">
          <div className="border-b border-white/10 pb-12">
            <h2 className="text-base font-semibold leading-7 text-white">
              Propose Transaction
            </h2>
            <p className="mt-1 text-sm leading-6 text-gray-400">
              This transaction will be proposed to the group
            </p>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label
                  htmlFor="address"
                  className="block text-sm font-medium leading-6 text-white"
                >
                  Address:
                </label>
                <div className="mt-2">
                  <input
                    id="address"
                    name="address"
                    type="address"
                    autoComplete="address"
                    className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                    onChange={(event) => setAddress(event.target.value)}
                    value={address}
                  />
                </div>
              </div>
              <div className="sm:col-span-4">
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium leading-6 text-white"
                >
                  Amount:
                </label>
                <div className="mt-2">
                  <input
                    id="amount"
                    name="amount"
                    type="amount"
                    autoComplete="amount"
                    className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                    onChange={(event) => setAmount(event.target.value)}
                    value={amount}
                  />
                </div>
              </div>
              <div className="sm:col-span-4">
                Signatures needed: {signaturesNeeded}
              </div>

              <div className="sm:col-span-3" style={{ display: 'none' }}>
                <label
                  htmlFor="signature"
                  className="block text-sm font-medium leading-6 text-white"
                >
                  Dummy drop down
                </label>
                <div className="mt-2">
                  <select
                    id="signature"
                    name="signature"
                    autoComplete="signature"
                    className="block w-full rounded-md border-0 bg-white/5 py-1.5 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6 [&_*]:text-black"
                  >
                    <option>ECDSA</option>
                    <option>BLS</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
          <button
            type="submit"
            className="rounded-md bg-green-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Propose
          </button>
        </div>
      </form>
    </div>
  );
}
