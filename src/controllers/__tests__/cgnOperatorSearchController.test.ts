import { NonEmptyString } from "italia-ts-commons/lib/strings";
import mockReq from "../../__mocks__/request";
import CgnOperatorSearchService from "../../services/cgnOperatorSearchService";
import { mockedUser } from "../../__mocks__/user_mock";
import CgnOperatorSearchController from "../cgnOperatorSearchController";
import {
  ResponseErrorInternal,
  ResponseSuccessJson
} from "italia-ts-commons/lib/responses";
import { Merchant } from "../../../generated/cgn-operator-search/Merchant";
import { ProductCategoryEnum } from "../../../generated/cgn-operator-search/ProductCategory";
import { CgnAPIClient } from "../../clients/cgn";
import CgnService from "../../services/cgnService";
import { CgnOperatorSearchAPIClient } from "../../clients/cgn-operator-search";
import mockRes from "../../__mocks__/response";
import { OnlineMerchantSearchRequest } from "../../../generated/cgn-operator-search/OnlineMerchantSearchRequest";
import {
  OfflineMerchantSearchRequest,
  OrderingEnum
} from "../../../generated/cgn-operator-search/OfflineMerchantSearchRequest";
import { NonNegativeInteger } from "italia-ts-commons/lib/numbers";
import { CardActivated } from "../../../generated/io-cgn-api/CardActivated";
import { CardExpired } from "../../../generated/io-cgn-api/CardExpired";
import { DiscountBucketCode } from "../../../generated/io-cgn-operator-search-api/DiscountBucketCode";

const anAPIKey = "";

const mockGetMerchant = jest.fn();
const mockGetOnlineMerchants = jest.fn();
const mockGetOfflineMerchants = jest.fn();
const mockGetDiscountBucketCode = jest.fn();
jest.mock("../../services/cgnOperatorSearchService", () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      getMerchant: mockGetMerchant,
      getOnlineMerchants: mockGetOnlineMerchants,
      getOfflineMerchants: mockGetOfflineMerchants,
      getDiscountBucketCode: mockGetDiscountBucketCode
    }))
  };
});

const mockGetCgnStatus = jest.fn().mockReturnValue(
  ResponseSuccessJson<CardActivated>({
    activation_date: new Date(),
    expiration_date: new Date(),
    status: "ACTIVATED"
  })
);
const mockGetEycaStatus = jest.fn();
const mockStartCgnActivation = jest.fn();
const mockGetCgnActivation = jest.fn();
const mockGetEycaActivation = jest.fn();
const mockStartEycaActivation = jest.fn();

const mockGenerateOtp = jest.fn();
jest.mock("../../services/cgnService", () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      getCgnActivation: mockGetCgnActivation,
      getCgnStatus: mockGetCgnStatus,
      getEycaActivation: mockGetEycaActivation,
      startCgnActivation: mockStartCgnActivation,
      startEycaActivation: mockStartEycaActivation,
      getEycaStatus: mockGetEycaStatus,
      generateOtp: mockGenerateOtp
    }))
  };
});

const badRequestErrorResponse = {
  detail: expect.any(String),
  status: 400,
  title: expect.any(String),
  type: undefined
};

const aMerchantId = "a_merchant_id" as NonEmptyString;

const aMerchant: Merchant = {
  description: "a Merchant description" as NonEmptyString,
  id: aMerchantId,
  name: "A merchant name" as NonEmptyString,
  discounts: [
    {
      name: "a Discount" as NonEmptyString,
      productCategories: [ProductCategoryEnum.entertainment],
      startDate: new Date(),
      endDate: new Date(),
      discount: 20
    }
  ]
};

const anOnlineMerchantSearchRequest: OnlineMerchantSearchRequest = {
  merchantName: "aMerchantName" as NonEmptyString,
  page: 0 as NonNegativeInteger,
  pageSize: 100,
  productCategories: [ProductCategoryEnum.entertainment]
};

const anOfflineMerchantSearchRequest: OfflineMerchantSearchRequest = {
  merchantName: "aMerchantName" as NonEmptyString,
  page: 0 as NonNegativeInteger,
  pageSize: 100,
  productCategories: [ProductCategoryEnum.entertainment],
  ordering: OrderingEnum.distance,
  userCoordinates: {
    latitude: 34.56,
    longitude: 45.89
  },
  boundingBox: {
    coordinates: {
      latitude: 34.56,
      longitude: 45.89
    },
    deltaLatitude: 6,
    deltaLongitude: 8
  }
};
const aDiscountId = "a_discount_id" as NonEmptyString;

const aDiscountBucketCode = { code: "asdfgh" } as DiscountBucketCode;

const aSearchResponse = { items: [] };

const clientCgn = CgnAPIClient(anAPIKey, "", "");
const cgnService = new CgnService(clientCgn);
const clientOperatorSearch = CgnOperatorSearchAPIClient(anAPIKey, "", "");
const cgnOperatorSearchService = new CgnOperatorSearchService(
  clientOperatorSearch
);
const controller = new CgnOperatorSearchController(
  cgnService,
  cgnOperatorSearchService
);

describe("CgnOperatorController#getMerchant", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should make the correct service method call", async () => {
    const req = {
      ...mockReq({ params: { merchantId: aMerchantId } }),
      user: mockedUser
    };

    await controller.getMerchant(req);

    expect(mockGetMerchant).toHaveBeenCalledWith(aMerchantId);
  });

  it("should not call getMerchant method on the CgnOperatorSearchService if cgn card is expired", async () => {
    const req = {
      ...mockReq({ params: { merchantId: aMerchantId } }),
      user: mockedUser
    };

    mockGetMerchant.mockReturnValue(
      Promise.resolve(ResponseSuccessJson(aMerchant))
    );

    mockGetCgnStatus.mockReturnValueOnce(
      ResponseSuccessJson<CardExpired>({
        activation_date: new Date(),
        expiration_date: new Date(),
        status: "EXPIRED"
      })
    );

    const response = await controller.getMerchant(req);

    expect(response).toEqual({
      apply: expect.any(Function),
      kind: "IResponseErrorForbiddenNotAuthorized",
      detail:
        "You are not allowed here: You do not have enough permission to complete the operation you requested"
    });
  });

  it("should not call getMerchant method on the CgnOperatorSearchService if cgn card status cannot be retrieved", async () => {
    const req = {
      ...mockReq({ params: { merchantId: aMerchantId } }),
      user: mockedUser
    };

    mockGetMerchant.mockReturnValue(
      Promise.resolve(ResponseSuccessJson(aMerchant))
    );

    mockGetCgnStatus.mockReturnValueOnce(ResponseErrorInternal("An error"));

    const response = await controller.getMerchant(req);

    expect(response).toEqual({
      apply: expect.any(Function),
      kind: "IResponseErrorInternal",
      detail: "Internal server error: Cannot retrieve cgn card status"
    });
  });

  it("should call getMerchant method on the CgnOperatorSearchService with valid values", async () => {
    const req = {
      ...mockReq({ params: { merchantId: aMerchantId } }),
      user: mockedUser
    };

    mockGetMerchant.mockReturnValue(
      Promise.resolve(ResponseSuccessJson(aMerchant))
    );

    const response = await controller.getMerchant(req);

    expect(response).toEqual({
      apply: expect.any(Function),
      kind: "IResponseSuccessJson",
      value: aMerchant
    });
  });

  it("should not call getMerchant method on the CgnOperatorSearchService with empty user", async () => {
    const req = {
      ...mockReq({ params: { merchantId: aMerchantId } }),
      user: undefined
    };
    const res = mockRes();

    const response = await controller.getMerchant(req);

    response.apply(res);

    // service method is not called
    expect(mockGetMerchant).not.toBeCalled();
    // http output is correct
    expect(res.json).toHaveBeenCalledWith(badRequestErrorResponse);
  });
});

describe("CgnOperatorController#getOnlineMerchants", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should make the correct service method call", async () => {
    const req = {
      ...mockReq({ body: anOnlineMerchantSearchRequest }),
      user: mockedUser
    };

    await controller.getOnlineMerchants(req);

    expect(mockGetOnlineMerchants).toHaveBeenCalledWith(
      anOnlineMerchantSearchRequest
    );
  });

  it("should call getOnlineMerchants method on the CgnOperatorSearchService with valid values", async () => {
    const req = {
      ...mockReq({ body: anOnlineMerchantSearchRequest }),
      user: mockedUser
    };

    mockGetOnlineMerchants.mockReturnValue(
      Promise.resolve(ResponseSuccessJson(aSearchResponse))
    );

    const response = await controller.getOnlineMerchants(req);

    expect(response).toEqual({
      apply: expect.any(Function),
      kind: "IResponseSuccessJson",
      value: aSearchResponse
    });
  });

  it("should not call getOnlineMerchants method on the CgnOperatorSearchService with empty user", async () => {
    const req = {
      ...mockReq({ body: anOnlineMerchantSearchRequest }),
      user: undefined
    };
    const res = mockRes();

    const response = await controller.getOnlineMerchants(req);

    response.apply(res);

    // service method is not called
    expect(mockGetOnlineMerchants).not.toBeCalled();
    // http output is correct
    expect(res.json).toHaveBeenCalledWith(badRequestErrorResponse);
  });
});

describe("CgnOperatorController#getOfflineMerchants", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should make the correct service method call", async () => {
    const req = {
      ...mockReq({ body: anOfflineMerchantSearchRequest }),
      user: mockedUser
    };

    await controller.getOfflineMerchants(req);

    expect(mockGetOfflineMerchants).toHaveBeenCalledWith(
      anOfflineMerchantSearchRequest
    );
  });

  it("should call getOfflineMerchants method on the CgnOperatorSearchService with valid values", async () => {
    const req = {
      ...mockReq({ body: anOfflineMerchantSearchRequest }),
      user: mockedUser
    };

    mockGetOfflineMerchants.mockReturnValue(
      Promise.resolve(ResponseSuccessJson(aSearchResponse))
    );

    const response = await controller.getOfflineMerchants(req);

    expect(response).toEqual({
      apply: expect.any(Function),
      kind: "IResponseSuccessJson",
      value: aSearchResponse
    });
  });

  it("should not call getOfflineMerchants method on the CgnOperatorSearchService with empty user", async () => {
    const req = {
      ...mockReq({ body: anOfflineMerchantSearchRequest }),
      user: undefined
    };
    const res = mockRes();

    const response = await controller.getOfflineMerchants(req);

    response.apply(res);

    // service method is not called
    expect(mockGetOfflineMerchants).not.toBeCalled();
    // http output is correct
    expect(res.json).toHaveBeenCalledWith(badRequestErrorResponse);
  });
});

describe("CgnOperatorController#getDiscountBucketCode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should make the correct service method call", async () => {
    const req = {
      ...mockReq({ params: { discountId: aDiscountId } }),
      user: mockedUser
    };

    await controller.getDiscountBucketCode(req);

    expect(mockGetDiscountBucketCode).toHaveBeenCalledWith(aDiscountId);
  });

  it("should not call getDiscountBucketCode method on the CgnOperatorSearchService if cgn card is expired", async () => {
    const req = {
      ...mockReq({ params: { discountId: aDiscountId } }),
      user: mockedUser
    };

    mockGetDiscountBucketCode.mockReturnValue(
      Promise.resolve(ResponseSuccessJson(aDiscountBucketCode))
    );

    mockGetCgnStatus.mockReturnValueOnce(
      ResponseSuccessJson<CardExpired>({
        activation_date: new Date(),
        expiration_date: new Date(),
        status: "EXPIRED"
      })
    );

    const response = await controller.getDiscountBucketCode(req);

    expect(response).toEqual({
      apply: expect.any(Function),
      kind: "IResponseErrorForbiddenNotAuthorized",
      detail:
        "You are not allowed here: You do not have enough permission to complete the operation you requested"
    });
  });

  it("should not call getDiscountBucketCode method on the CgnOperatorSearchService if cgn card status cannot be retrieved", async () => {
    const req = {
      ...mockReq({ params: { discountId: aDiscountId } }),
      user: mockedUser
    };

    mockGetDiscountBucketCode.mockReturnValue(
      Promise.resolve(ResponseSuccessJson(aDiscountBucketCode))
    );

    mockGetCgnStatus.mockReturnValueOnce(ResponseErrorInternal("An error"));

    const response = await controller.getDiscountBucketCode(req);

    expect(response).toEqual({
      apply: expect.any(Function),
      kind: "IResponseErrorInternal",
      detail: "Internal server error: Cannot retrieve cgn card status"
    });
  });

  it("should call getDiscountBucketCode method on the CgnOperatorSearchService with valid values", async () => {
    const req = {
      ...mockReq({ params: { discountId: aDiscountId } }),
      user: mockedUser
    };

    mockGetDiscountBucketCode.mockReturnValue(
      Promise.resolve(ResponseSuccessJson(aDiscountBucketCode))
    );

    const response = await controller.getDiscountBucketCode(req);

    expect(response).toEqual({
      apply: expect.any(Function),
      kind: "IResponseSuccessJson",
      value: aDiscountBucketCode
    });
  });

  it("should not call getDiscountBucketCode method on the CgnOperatorSearchService with empty user", async () => {
    const req = {
      ...mockReq({ params: { discountId: aDiscountId } }),
      user: undefined
    };
    const res = mockRes();

    const response = await controller.getDiscountBucketCode(req);

    response.apply(res);

    // service method is not called
    expect(mockGetDiscountBucketCode).not.toBeCalled();
    // http output is correct
    expect(res.json).toHaveBeenCalledWith(badRequestErrorResponse);
  });
});