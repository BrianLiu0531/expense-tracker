import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionForm from './TransactionForm';

function setup(props: Partial<Parameters<typeof TransactionForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(<TransactionForm region="AU" onSubmit={onSubmit} onCancel={vi.fn()} {...props} />);
  return { onSubmit, user: userEvent.setup() };
}

describe('TransactionForm', () => {
  it('shows validation errors and does not submit invalid input', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText(/amount/i), 'abc');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByText(/enter a positive amount/i)).toBeInTheDocument();
    expect(screen.getByText(/choose a category/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits amounts in cents with the chosen category', async () => {
    const { onSubmit, user } = setup();
    await user.click(screen.getByRole('radio', { name: 'Income' }));
    await user.type(screen.getByLabelText(/amount/i), '1,250.50');
    await user.selectOptions(screen.getByLabelText(/category/i), 'Freelance');
    await user.clear(screen.getByLabelText(/date/i));
    await user.type(screen.getByLabelText(/date/i), '2025-09-01');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'INCOME',
      amountCents: 125050,
      category: 'Freelance',
      date: '2025-09-01',
      description: null,
      gstApplicable: false,
    });
  });

  it('previews the GST component for the region', async () => {
    const { user } = setup({ region: 'NZ' });
    await user.type(screen.getByLabelText(/amount/i), '115');
    await user.click(screen.getByLabelText(/includes gst/i));
    expect(screen.getByText(/\$15\.00 reportable to IRD/)).toBeInTheDocument();
  });

  it('pre-fills values when editing', () => {
    setup({
      initial: {
        type: 'EXPENSE',
        amountCents: 2200,
        category: 'Dining',
        date: '2025-08-15',
        description: 'Coffee',
        gstApplicable: true,
      },
    });
    expect(screen.getByLabelText(/amount/i)).toHaveValue('22.00');
    expect(screen.getByLabelText(/category/i)).toHaveValue('Dining');
    expect(screen.getByLabelText(/includes gst/i)).toBeChecked();
  });
});
