import {
  saveSettingsSchema,
  getProfileSchema,
  uploadPhotoUrlSchema,
  updateProfilePhotoUrlSchema,
} from "../../../schema/profile";

import { getPresignedUrl } from "../../common/getPresignedUrl";

import { router, publicProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const profileRouter = router({
  edit: protectedProcedure
    .input(saveSettingsSchema)
    .mutation(async ({ input, ctx }) => {
      const profile = await ctx.prisma.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          ...input,
        },
      });
      return profile;
    }),
  updateProfilePhotoUrl: protectedProcedure
    .input(updateProfilePhotoUrlSchema)
    .mutation(async ({ input, ctx }) => {
      const profile = await ctx.prisma.user.update({
        where: {
          id: ctx.session.user.id,
        },
        data: {
          image: input.url,
        },
      });
      return profile;
    }),
  getUploadUrl: protectedProcedure
    .input(uploadPhotoUrlSchema)
    .mutation(async ({ ctx, input }) => {
      const { size, type } = input;
      const extension = type.split("/")[1];

      if (!["jpg", "jpeg", "gif", "png", "webp"].includes(extension)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid file format.",
        });
      }

      if (size > 8388608) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Maximum file size 8mb",
        });
      }

      const response = await getPresignedUrl(ctx.session.user.id, type, size);

      return response;
    }),
  get: publicProcedure.input(getProfileSchema).query(async ({ ctx, input }) => {
    const { username } = input;
    const profile = await ctx.prisma.user.findUnique({
      where: {
        username,
      },
      select: {
        bio: true,
        username: true,
        name: true,
        image: true,
        posts: {
          where: {
            NOT: {
              published: null,
            },
          },
          orderBy: {
            published: "desc",
          },
          select: {
            title: true,
            excerpt: true,
            slug: true,
            readTimeMins: true,
            published: true,
            id: true,
          },
        },
      },
    });

    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Profile not found",
      });
    }

    return profile;
  }),
});