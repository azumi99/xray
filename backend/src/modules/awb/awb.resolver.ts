import { Args, ID, Int, Mutation, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AwbService } from './awb.service.js';
import { AirwaybillXray, AirwaybillXrayDetail } from '../../entities/airwaybill-xray.entity.js';
import { WatchedFile } from '../../entities/watched-file.entity.js';
import { HostawbData } from './hostawb.types.js';
import { HostawbService } from './hostawb.service.js';
import {
  AirwaybillXrayPage,
  CreateAirwaybillXrayDetailInput,
  CreateAirwaybillXrayInput,
  CreateWatchedFileInput,
  QueryOrderByClause,
  WatchedFilePage,
} from './awb.types.js';

@Resolver(() => AirwaybillXray)
export class AwbResolver {
  constructor(
    private readonly awbService: AwbService,
    private readonly hostawbService: HostawbService,
  ) {}

  @ResolveField('hostawb', () => HostawbData, { nullable: true })
  hostawb(parent: AirwaybillXray) {
    return this.hostawbService.findByAwb(parent.airwaybill_number, parent.hawb);
  }

  @Query(() => AirwaybillXrayPage, { name: 'airwaybillxrays' })
  listAirwaybillXrays(
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('orderBy', { type: () => [QueryOrderByClause], nullable: true })
    orderBy?: QueryOrderByClause[],
    @Args('ungrouped', { type: () => Boolean, nullable: true }) ungrouped?: boolean,
  ) {
    return this.awbService.list(first, page, orderBy, ungrouped);
  }

  @Query(() => AirwaybillXrayPage, { name: 'searchAirwaybillxrays' })
  searchAirwaybillXrays(
    @Args('search', { nullable: true }) search?: string,
    @Args('first', { type: () => Int, nullable: true }) first?: number,
    @Args('page', { type: () => Int, nullable: true }) page?: number,
    @Args('orderBy', { type: () => [QueryOrderByClause], nullable: true })
    orderBy?: QueryOrderByClause[],
    @Args('ungrouped', { type: () => Boolean, nullable: true }) ungrouped?: boolean,
  ) {
    return this.awbService.search(search, first, page, orderBy, ungrouped);
  }

  @Query(() => AirwaybillXray, { name: 'airwaybillXrayByNumber', nullable: true })
  airwaybillXrayByNumber(@Args('airwaybill_number') airwaybillNumber: string) {
    return this.awbService.byNumber(airwaybillNumber);
  }

  @Query(() => AirwaybillXray, { name: 'airwaybillxray', nullable: true })
  airwaybillXray(@Args('id', { type: () => ID }) id: string) {
    return this.awbService.byId(id);
  }

  @Query(() => AirwaybillXray, { name: 'airwaybillXrayWithDetails', nullable: true })
  airwaybillXrayWithDetails(@Args('id', { type: () => ID }) id: string) {
    return this.awbService.byId(id);
  }

  @Query(() => WatchedFilePage, { name: 'watchedFiles' })
  watchedFiles(@Args('first', { type: () => Int, nullable: true }) first?: number) {
    return this.awbService.watchedFilesPage(first);
  }

  @Mutation(() => AirwaybillXray, { name: 'createAirwaybillXray' })
  createAirwaybillXray(@Args('input') input: CreateAirwaybillXrayInput) {
    return this.awbService.create(input);
  }

  @Mutation(() => AirwaybillXray, { name: 'createAirwaybillXrayBatch' })
  createAirwaybillXrayBatch(@Args('input') input: CreateAirwaybillXrayInput) {
    return this.awbService.createBatch(input);
  }

  @Mutation(() => AirwaybillXrayDetail, { name: 'createAirwaybillXrayDetail' })
  createAirwaybillXrayDetail(@Args('input') input: CreateAirwaybillXrayDetailInput) {
    return this.awbService.createDetail(input);
  }

  @Mutation(() => AirwaybillXray, { name: 'updateAirwaybillXrayStatus' })
  updateAirwaybillXrayStatus(
    @Args('id', { type: () => ID }) id: string,
    @Args('status') status: string,
  ) {
    return this.awbService.updateStatus(id, status);
  }

  @Mutation(() => AirwaybillXray, { name: 'captureXrayPair' })
  captureXrayPair(
    @Args('topImage') topImage: string,
    @Args('sideImage') sideImage: string,
    @Args('queueIndex', { type: () => Int, nullable: true }) queueIndex?: number,
  ) {
    return this.awbService.capturePair(topImage, sideImage, queueIndex ?? 0);
  }

  @Mutation(() => AirwaybillXray, { name: 'deleteAirwaybillXray' })
  deleteAirwaybillXray(@Args('id', { type: () => ID }) id: string) {
    return this.awbService.delete(id);
  }

  @Mutation(() => WatchedFile, { name: 'createWatchedFile' })
  createWatchedFile(@Args('input') input: CreateWatchedFileInput) {
    return this.awbService.createWatchedFile(input);
  }
}
