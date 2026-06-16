export default function FlagImage({ code, style }) {
  if (!code || code.length !== 2) return null
  const lower = code.toLowerCase()
  return (
    <img
      src={`https://flagcdn.com/w20/${lower}.png`}
      srcSet={`https://flagcdn.com/w40/${lower}.png 2x`}
      width="20"
      height="15"
      alt={code}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: 1, ...style }}
    />
  )
}
