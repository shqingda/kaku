import { useMutation, type MutateOptions, type UseMutationOptions } from '@tanstack/react-query';
import { useAuthActions } from './auth-provider';
import { AuthSessionChangedError, type AuthRequest, type AuthRequestScope } from './auth-request-scope';

type AuthMutationOptions<TData, TError, TInput, TContext> = Omit<
  UseMutationOptions<TData, TError, TInput, TContext>,
  'mutationFn' | 'onMutate' | 'onSuccess' | 'onError' | 'onSettled'
> & {
  mutationFn: (input: TInput, request: AuthRequest) => Promise<TData>;
  onMutate?: (input: TInput, scope: AuthRequestScope) => TContext | Promise<TContext>;
  onSuccess?: (data: TData, input: TInput, context: TContext | undefined, scope: AuthRequestScope) => unknown;
  onError?: (error: TError, input: TInput, context: TContext | undefined, scope: AuthRequestScope) => unknown;
  onSettled?: (data: TData | undefined, error: TError | null, input: TInput, context: TContext | undefined, scope: AuthRequestScope) => unknown;
};
type ScopedInput<T> = { input: T; scope: AuthRequestScope };
function assertCurrent(scope: AuthRequestScope) {
  if (!scope.isCurrent()) throw new AuthSessionChangedError();
}

// Capture identity when mutate is called, before TanStack can pause or queue it.
export function useAuthMutation<TData, TError = Error, TInput = void, TContext = unknown>(
  options: AuthMutationOptions<TData, TError, TInput, TContext>,
) {
  const { captureRequest } = useAuthActions();
  const mutation = useMutation<TData, TError, ScopedInput<TInput>, TContext | undefined>({
    ...options,
    mutationFn: async ({ input, scope }) => {
      assertCurrent(scope);
      const result = await options.mutationFn(input, scope.request);
      assertCurrent(scope);
      return result;
    },
    onMutate: async ({ input, scope }) => {
      assertCurrent(scope);
      const context = await options.onMutate?.(input, scope);
      assertCurrent(scope);
      return context;
    },
    onSuccess: (data, { input, scope }, context) => scope.isCurrent() ? options.onSuccess?.(data, input, context, scope) : undefined,
    onError: (error, { input, scope }, context) => scope.isCurrent() ? options.onError?.(error, input, context, scope) : undefined,
    onSettled: (data, error, { input, scope }, context) => scope.isCurrent() ? options.onSettled?.(data, error, input, context, scope) : undefined,
  });
  const callOptions = (callbacks?: MutateOptions<TData, TError, TInput, TContext>): MutateOptions<TData, TError, ScopedInput<TInput>, TContext | undefined> => ({
    onSuccess: (data, { input, scope }, context, mutationContext) => {
      if (scope.isCurrent()) callbacks?.onSuccess?.(data, input, context, mutationContext);
    },
    onError: (error, { input, scope }, context, mutationContext) => {
      if (scope.isCurrent()) callbacks?.onError?.(error, input, context, mutationContext);
    },
    onSettled: (data, error, { input, scope }, context, mutationContext) => {
      if (scope.isCurrent()) callbacks?.onSettled?.(data, error, input, context, mutationContext);
    },
  });
  return {
    ...mutation,
    variables: mutation.variables?.input,
    mutate: (input: TInput, callbacks?: MutateOptions<TData, TError, TInput, TContext>) => {
      mutation.mutate({ input, scope: captureRequest() }, callOptions(callbacks));
    },
    mutateAsync: async (input: TInput, callbacks?: MutateOptions<TData, TError, TInput, TContext>) => {
      const scope = captureRequest();
      const result = await mutation.mutateAsync({ input, scope }, callOptions(callbacks));
      assertCurrent(scope);
      return result;
    },
  };
}
