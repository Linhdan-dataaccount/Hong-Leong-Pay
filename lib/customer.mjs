import { installment } from './engine.mjs';
export function schedule(principal, months, annualRate = .18) {
  const payment = installment(principal, months, annualRate);
  let balance = principal;
  return Array.from({ length: months }, (_, i) => {
    const interest = balance * annualRate / 12;
    const principalPaid = i === months - 1 ? balance : payment - interest;
    const actualPayment = principalPaid + interest;
    balance = Math.max(0, balance - principalPaid);
    return { principal: principalPaid, interest, payment: actualPayment, balance };
  });
}
export function nextDueDate(start, number) {
  const date = new Date(start);
  const due = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + number, 1));
  const last = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth() + 1, 0)).getUTCDate();
  due.setUTCDate(Math.min(date.getUTCDate(), last));
  return due.toISOString().slice(0, 10);
}
