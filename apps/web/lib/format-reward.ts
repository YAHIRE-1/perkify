// rewardAmount comes from numeric(36,18) → string like "0050.500000000000000000"
export function formatReward(value: unknown, maxDecimals = 4) {
  const raw = String(value ?? '').trim();
  if (!/^\d*\.?\d*$/.test(raw) || raw === '' || raw === '.') {
    return { text: '0', full: '0' };
  }

  let [int = '', dec = ''] = raw.split('.');
  int = int.replace(/^0+(?=\d)/, '') || '0'; // leading zeros
  dec = dec.replace(/0+$/, '');              // trailing zeros

  const full = dec ? `${int}.${dec}` : int;
  const shownDec = dec.slice(0, maxDecimals).replace(/0+$/, '');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // > 0 but too small to display
  if (int === '0' && dec && !shownDec) {
    return { text: `<0.${'0'.repeat(maxDecimals - 1)}1`, full };
  }

  return { text: shownDec ? `${grouped}.${shownDec}` : grouped, full };
}