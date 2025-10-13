export const PowerBIIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 110 125"
    height={30}
    fill="none"
    {...props}
  >
    <path
      fill="#CF890A"
      d="M89.464 0H56.33a5.159 5.159 0 0 0-5.159 5.159V119.84A5.159 5.159 0 0 0 56.33 125h33.134a5.159 5.159 0 0 0 5.159-5.159V5.159c0-2.85-2.31-5.159-5.159-5.159Z"
    />
    <g filter="url(#a)">
      <path
        fill="#000"
        d="M69.028 119.841V125H30.734a5.159 5.159 0 0 1-5.159-5.159V36.31a5.159 5.159 0 0 1 5.159-5.16h33.135c2.849 0 5.159 2.31 5.159 5.16v83.531Z"
      />
    </g>
    <path
      fill="#ECBF43"
      d="M69.028 119.841V125H30.734a5.159 5.159 0 0 1-5.159-5.159V36.31a5.159 5.159 0 0 1 5.159-5.16h33.135c2.849 0 5.159 2.31 5.159 5.16v83.531Z"
    />
    <path
      fill="#F9E68B"
      fillRule="evenodd"
      d="M43.83 119.841V125H5.535a5.159 5.159 0 0 1-5.159-5.159V67.659c0-2.85 2.31-5.159 5.159-5.159H38.67c2.849 0 5.158 2.31 5.158 5.159v52.182Z"
      clipRule="evenodd"
    />
    <defs>
      <filter
        id="a"
        width={83.452}
        height={133.849}
        x={25.575}
        y={21.151}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset dx={20} dy={10} />
        <feGaussianBlur stdDeviation={10} />
        <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.0530212 0" />
        <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_515_13" />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_515_13"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
);
