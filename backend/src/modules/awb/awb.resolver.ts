import { Args, ID, Int, Mutation, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { AirwaybillXray, AirwaybillXrayDetail } from '../../entities/airwaybill-xray.entity.js';
import { WatchedFile } from '../../entities/watched-file.entity.js';
import { HostawbData } from './hostawb.types.js';
import { AwbRegistry } from './awb-registry.service.js';
import {
  AirwaybillXrayPage,
  CreateAirwaybillXrayDetailInput,
  CreateAirwaybillXrayInput,
  CreateWatchedFileInput,
  QueryOrderByClause,
  SearchFilterInput,
  WatchedFilePage,
} from './awb.types.js';

@Resolver(() => AirwaybillXray)
export class AwbResolver {
  constructor(private readonly registry: AwbRegistry) {}

  /** Service per gudang aktif (x-warehouse header, lihat warehouse.ts) —
   *  seluruh method resolver memakai getter ini, bodies tidak berubah. */
  private get awbService() {
    return this.registry.awb();
  }

  private get hostawbService() {
    return this.registry.hostawb();
  }

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
    @Args('filters', { type: () => SearchFilterInput, nullable: true }) filters?: SearchFilterInput,
  ) {
    return this.awbService.search(search, first, page, orderBy, ungrouped, filters);
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

  @Query(() => AirwaybillXray, { name: 'existsScan', nullable: true })
  existsScan(
    @Args('mawb') mawb: string,
    @Args('part', { type: () => Int }) part: number,
  ) {
    return this.awbService.existsScan(mawb, part);
  }

  @Mutation(() => AirwaybillXray, { name: 'rescanAwb' })
  rescanAwb(
    @Args('id', { type: () => ID }) id: string,
    @Args('types', { type: () => [String] }) types: string[],
    @Args('photo', { nullable: true }) photo?: string,
  ) {
    return this.awbService.rescan(id, types, photo);
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
