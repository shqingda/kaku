type LoadableQuery = {
  isError: boolean;
  isPaused: boolean;
  isPending: boolean;
};

// 断网且没有缓存时，React Query 会暂停请求，isPending 一直是 true，页面就永远
// 停在“加载中”。这里把它当成读取失败，页面已有的错误提示和重试按钮都能复用；
// 恢复联网后请求自动继续，状态随之回到加载中。
export function loadStatus(query: LoadableQuery) {
  const isWaitingForNetwork = query.isPending && query.isPaused;

  return {
    isError: query.isError || isWaitingForNetwork,
    isPending: query.isPending && !isWaitingForNetwork,
  };
}
