/* Relative Imports */
import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";

/* Local Imports */
import type { AppDispatch, RootState } from "@/store";

// ----------------------------------------------------------------------

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
