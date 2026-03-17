import { expect, test, mock, spyOn } from "bun:test";
import { fetchNewPosts } from "./ozbargain";
import { sendNotification } from "./ntfy";

test("fetchNewPosts calls correct URL", async () => {
  const mockFetch = mock(() => Promise.resolve(new Response(JSON.stringify({
    timestamp: 12345,
    records: [],
    sessions: [1, 2]
  }))));
  
  global.fetch = mockFetch;

  const result = await fetchNewPosts(0);
  
  expect(mockFetch).toHaveBeenCalled();
  expect(result.timestamp).toBe(12345);
});

test("sendNotification sends correct body", async () => {
  const mockFetch = mock(() => Promise.resolve(new Response("OK")));
  global.fetch = mockFetch;

  const record = {
    action: "Post",
    name: "User",
    uid: 1,
    user: "User",
    title: "Test Deal",
    timestamp: 12345,
    type: "Deal",
    link: "/node/123"
  };

  await sendNotification(record);

  expect(mockFetch).toHaveBeenCalled();
  const call = mockFetch.mock.calls[0];
  const payload = JSON.parse(call[1].body);
  expect(payload.title).toBe("Test Deal");
  expect(payload.attach).toBe("https://files.ozbargain.com.au/n/23/123.jpg");
  expect(payload.message).toContain("Post by User");
});

test("sendNotification retries on 429", async () => {
  const mockFetch = mock()
    .mockImplementationOnce(() => Promise.resolve(new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": "1" }
    })))
    .mockImplementationOnce(() => Promise.resolve(new Response("OK")));
    
  global.fetch = mockFetch;

  const record = {
    action: "Post",
    name: "User",
    uid: 1,
    user: "User",
    title: "Retry Deal",
    timestamp: 12345,
    type: "Deal",
    link: "/node/123"
  };

  await sendNotification(record);

  expect(mockFetch).toHaveBeenCalledTimes(2);
});
