'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/app-shell';
import { UnauthorizedState } from '@/components/access-state';
import { useToast } from '@/components/toast';
import { Card, ErrorMessage, InfoTooltip, SectionHeading, Spinner } from '@/components/ui';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateInputToEpoch, epochToDateInput, formatCurrency, simpleInterest, totalRepayment } from '@/lib/format';
import { PAN_FORMAT_HELP, PAN_REGEX } from '@/lib/validation';
import { EligibilityResult, EmploymentMode, User } from '@/lib/types';

const steps = ['Personal details', 'Salary slip', 'Loan configuration'];

interface ProfileResponse {
  profile: User;
  eligibility: EligibilityResult;
}

export default function BorrowerApplyPage() {
  const { user, loading, updateUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState('');
  const [pan, setPan] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [employmentMode, setEmploymentMode] = useState<EmploymentMode>('SALARIED');
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [salarySlip, setSalarySlip] = useState<File | null>(null);
  const [salarySlipPreviewUrl, setSalarySlipPreviewUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState(150000);
  const [tenureDays, setTenureDays] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'BORROWER') return;
    apiFetch<ProfileResponse>('/borrower/profile')
      .then(({ profile, eligibility: currentEligibility }) => {
        setFullName(profile.fullName ?? '');
        setPan(profile.pan ?? '');
        setDateOfBirth(epochToDateInput(profile.dateOfBirth));
        setMonthlySalary(profile.monthlySalary ? String(profile.monthlySalary) : '');
        setEmploymentMode(profile.employmentMode ?? 'SALARIED');
        setEligibility(currentEligibility);
      })
      .catch(() => toast.error('Unable to load your borrower profile.'));
  }, [user]);

  useEffect(() => {
    if (!salarySlip) {
      setSalarySlipPreviewUrl(null);
      return;
    }
    const previewUrl = URL.createObjectURL(salarySlip);
    setSalarySlipPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [salarySlip]);

  const interest = useMemo(() => simpleInterest(amount, tenureDays), [amount, tenureDays]);
  const repayment = useMemo(() => totalRepayment(amount, tenureDays), [amount, tenureDays]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const normalizedPan = pan.trim().toUpperCase();
    if (!PAN_REGEX.test(normalizedPan)) {
      const message = 'PAN must be 10 characters: 5 letters, 4 digits, then 1 letter.';
      setError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch<ProfileResponse>('/borrower/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, pan: normalizedPan, dateOfBirth: dateInputToEpoch(dateOfBirth), monthlySalary, employmentMode }),
        headers: { 'Content-Type': 'application/json' },
      });
      updateUser({
        fullName: result.profile.fullName,
        pan: result.profile.pan,
        dateOfBirth: result.profile.dateOfBirth,
        monthlySalary: result.profile.monthlySalary,
        employmentMode: result.profile.employmentMode,
        profileCompleted: result.profile.profileCompleted,
      });
      setEligibility(result.eligibility);
      if (!result.eligibility.eligible) {
        setError('Please resolve the eligibility issues below before continuing.');
        toast.error('Eligibility check failed. Review the highlighted requirements.');
        return;
      }
      toast.success('Eligibility passed. Continue to upload your salary slip.');
      setStep(1);
    } catch (submissionError) {
      const message = submissionError instanceof ApiError ? submissionError.message : 'Unable to save personal details.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectSalarySlip = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    const accepted = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!accepted.includes(file.type)) {
      setSalarySlip(null);
      const message = 'Salary slip must be a PDF, JPG, or PNG file.';
      setError(message);
      toast.error(message);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSalarySlip(null);
      const message = 'Salary slip must be 5 MB or smaller.';
      setError(message);
      toast.error(message);
      return;
    }
    setSalarySlip(file);
    toast.success('Salary slip selected.');
  };

  const apply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!salarySlip) {
      const message = 'Please select a salary slip before continuing.';
      setError(message);
      toast.error(message);
      return;
    }
    setError(null);
    setSubmitting(true);
    const formData = new FormData();
    formData.append('salarySlip', salarySlip);
    formData.append('amount', String(amount));
    formData.append('tenureDays', String(tenureDays));
    try {
      await apiFetch('/borrower/loans/apply', { method: 'POST', body: formData });
      toast.success('Loan application submitted successfully.');
      router.push('/borrower/loan');
    } catch (submissionError) {
      const message = submissionError instanceof ApiError ? submissionError.message : 'Unable to submit loan application.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && user && user.role !== 'BORROWER') {
    return (
      <AppShell>
        <UnauthorizedState
          title="This is the borrower portal"
          description="Your account is an operations role, so borrower applications are not available here. Open your operations workspace to continue."
          actionHref="/dashboard"
          actionLabel="Open operations workspace"
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SectionHeading
        eyebrow="Borrower portal"
        title="Start a loan application"
        description="Complete each step. Eligibility is checked by the server before your application can be submitted."
      />
      <div className="mb-8 grid gap-2 sm:grid-cols-3">
        {steps.map((label, index) => (
          <div
            key={label}
            className={`rounded-xl border px-4 py-3 ${index === step ? 'border-ink bg-ink text-white' : index < step ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider">Step {index + 1}</p>
            <p className="mt-1 text-sm font-semibold">{label}</p>
          </div>
        ))}
      </div>
      <ErrorMessage message={error} />

      {step === 0 && (
        <Card className="animate-in fade-in slide-in-from-right-3 p-6 duration-500 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-ink">Personal details</h2>
            <p className="mt-1 text-sm text-slate-500">These fields are used for the business rule engine.</p>
          </div>
          <form onSubmit={saveProfile} className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm font-semibold">
              Full name
              <input className="field" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </label>
            <label className="block text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5">
                PAN{' '}
                <InfoTooltip id="pan-format-tooltip" label="PAN format help">
                  {PAN_FORMAT_HELP}
                </InfoTooltip>
              </span>
              <input
                className="field uppercase"
                value={pan}
                onChange={(event) => setPan(event.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                pattern={PAN_REGEX.source}
                maxLength={10}
                title={PAN_FORMAT_HELP}
                required
              />
            </label>
            <label className="block text-sm font-semibold">
              Date of birth
              <input className="field" type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} required />
            </label>
            <label className="block text-sm font-semibold">
              Monthly salary
              <input
                className="field"
                type="number"
                min="0"
                value={monthlySalary}
                onChange={(event) => setMonthlySalary(event.target.value)}
                placeholder="25000"
                required
              />
            </label>
            <label className="block text-sm font-semibold md:col-span-2">
              Employment mode
              <select
                className="field"
                value={employmentMode}
                onChange={(event) => setEmploymentMode(event.target.value as EmploymentMode)}
              >
                <option value="SALARIED">Salaried</option>
                <option value="SELF_EMPLOYED">Self-employed</option>
                <option value="UNEMPLOYED">Unemployed</option>
              </select>
            </label>
            {eligibility && !eligibility.eligible && (
              <div className="md:col-span-2 rounded-xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-sm font-bold text-rose-700">Application not eligible yet</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-700">
                  {eligibility.errors.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {eligibility?.eligible && (
              <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                Eligibility passed. Continue to upload your salary slip.
              </div>
            )}
            <div className="md:col-span-2 flex justify-end">
              <button className="primary-button" disabled={submitting}>
                {submitting && <Spinner />}
                {submitting ? 'Checking eligibility…' : 'Save and continue'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {step === 1 && (
        <Card className="animate-in fade-in slide-in-from-right-3 p-6 duration-500 md:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-ink">Upload salary slip</h2>
            <p className="mt-1 text-sm text-slate-500">Accepted formats: PDF, JPG, or PNG. Maximum size: 5 MB.</p>
          </div>
          <label className="group flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center transition hover:border-blue-400 hover:bg-blue-50">
            <span className="text-3xl transition-transform duration-300 group-hover:-translate-y-1">↑</span>
            <span className="mt-3 text-sm font-bold text-ink">{salarySlip ? salarySlip.name : 'Choose a salary slip'}</span>
            <span className="mt-1 text-xs text-slate-500">Click to browse files</span>
            <input type="file" className="hidden" accept="application/pdf,image/jpeg,image/png" onChange={selectSalarySlip} />
          </label>
          {salarySlipPreviewUrl && (
            <div className="animate-in fade-in zoom-in-95 mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 duration-300">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <p className="text-sm font-bold text-ink">Selected file preview</p>
                <span className="text-xs text-slate-500">{salarySlip?.type === 'application/pdf' ? 'PDF document' : 'Image'}</span>
              </div>
              {salarySlip?.type === 'application/pdf' ? (
                <iframe title="Salary slip preview" src={salarySlipPreviewUrl} className="h-[28rem] w-full bg-white" />
              ) : (
                <img src={salarySlipPreviewUrl} alt="Salary slip preview" className="max-h-[28rem] w-full object-contain p-4" />
              )}
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <button className="secondary-button" onClick={() => setStep(0)}>
              Back
            </button>
            <button
              className="primary-button"
              disabled={!salarySlip}
              onClick={() => {
                setError(null);
                setStep(2);
                toast.info('Salary slip selected. Configure your loan.');
              }}
            >
              Continue to loan configuration
            </button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-in fade-in slide-in-from-right-3 p-6 duration-500 md:p-8">
          <div className="mb-7">
            <h2 className="text-lg font-bold text-ink">Configure your loan</h2>
            <p className="mt-1 text-sm text-slate-500">Choose an amount and repayment tenure within the allowed range.</p>
          </div>
          <form onSubmit={apply} className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div className="space-y-8">
              <label className="block">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>Loan amount</span>
                  <span className="text-blue-600 transition-all duration-300">{formatCurrency(amount)}</span>
                </div>
                <input
                  className="mt-5 w-full accent-blue-600 transition-all"
                  type="range"
                  min="50000"
                  max="500000"
                  step="5000"
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                />
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>₹50,000</span>
                  <span>₹5,00,000</span>
                </div>
              </label>
              <label className="block">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span>Tenure</span>
                  <span className="text-blue-600 transition-all duration-300">{tenureDays} days</span>
                </div>
                <input
                  className="mt-5 w-full accent-blue-600 transition-all"
                  type="range"
                  min="30"
                  max="365"
                  step="1"
                  value={tenureDays}
                  onChange={(event) => setTenureDays(Number(event.target.value))}
                />
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>30 days</span>
                  <span>365 days</span>
                </div>
              </label>
              <div className="flex justify-between">
                <button type="button" className="secondary-button" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="primary-button" disabled={submitting}>
                  {submitting && <Spinner />}
                  {submitting ? 'Submitting…' : 'Apply for loan'}
                </button>
              </div>
            </div>
            <div className="rounded-2xl bg-ink p-6 text-white transition-transform duration-300 hover:-translate-y-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-300">Calculation</p>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex justify-between text-slate-300">
                  <span>Principal</span>
                  <span className="font-semibold text-white">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Interest rate</span>
                  <span className="font-semibold text-white">12% p.a.</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Simple interest</span>
                  <span className="font-semibold text-white">{formatCurrency(interest)}</span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total repayment</span>
                    <span className="text-lg font-black">{formatCurrency(repayment)}</span>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </Card>
      )}
    </AppShell>
  );
}
