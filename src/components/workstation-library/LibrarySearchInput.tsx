"use client";

import styled from "styled-components";

const baseInputStyles = `
  box-sizing: border-box;
  font-size: 0.75rem;
`;

export const LibrarySearchInput = styled.input`
  width: 100%;
  ${baseInputStyles}
  padding: 5px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.small};
  border: 1px solid ${({ theme }) => theme.colors.border.tertiary.normal};
  color: ${({ theme }) => theme.colors.font.tertiary.normal};
  background: ${({ theme }) => theme.colors.bg.background.normal};

  &::placeholder {
    color: ${({ theme }) => theme.colors.font.disabled.normal};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.border.primary.normal};
  }
`;

/** Same visual style as LibrarySearchInput, used for general text/number fields (not just search boxes). */
export const LibraryTextInput = LibrarySearchInput.withComponent("input");
